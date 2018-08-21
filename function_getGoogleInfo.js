exports = function(changeEvent) {

  // WHAT THIS DOES: Extract changeEvent full document into a usable variable
  var fullDocument = changeEvent.fullDocument;

  // ACTION REQUIRED BELOW: Replace "name" by whatever field name you are using to contain the searchable business name information
  // WHAT THIS DOES: The field "name" probably contains spaces. The following makes it usable as a URL by replacing spaces by %20.
  searchableName = encodeURIComponent(fullDocument.name.trim());

  // ACTION REQUIRED BELOW: Replace "GooglePlacesAPIKey" by the name of the Stitch Value you are using for your Google API Key.
  // Alternatively, replace context.values.get("GooglePlacesAPIKey") by your API Key if you are not using Stitch Value.
  // WHAT THIS DOES: Compose Google Place searchable URL and set it to return a JSON document with only the Place ID
  GooglePlacesSearchURL ="https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input="+searchableName+"&inputtype=textquery&fields=place_id&key="+context.values.get("GooglePlacesAPIKey");

  // ACTION REQUIRED BELOW: Replace "GooglePlaces" by the name of the Stitch HTTP GET Service you created.
  const http = context.services.get("GooglePlaces");
  return http
    .get({url: GooglePlacesSearchURL})
    .then(resp=>{
        //The response body is encoded as raw BSON.Binary. Parse it to JSON.
        var search_result = EJSON.parse(resp.body.text());

        // ACTION REQUIRED BELOW: edit the list of Google Places fields you are interested in. See documentation for full list.
        // Be careful, since those fields are also listed under the update routine of the MongoDB document below. All fields that are updated by the below Update routine should be present in the below query fields
        queryFields = "formatted_address,geometry,name,place_id,type,vicinity,formatted_phone_number,international_phone_number,opening_hours,website,rating";
        GoogleDetailsURL ="https://maps.googleapis.com/maps/api/place/details/json?placeid="+search_result.candidates[0].place_id+"&fields="+queryFields+"&key="+context.values.get("GooglePlacesAPIKey");

        // ACTION REQUIRED BELOW: Replace "GooglePlaces" by the name of the Stitch HTTP GET Service you created.
        const http = context.services.get("GooglePlaces");
        return http
          .get({url: GoogleDetailsURL})
          .then(resp=>{
              //The response body is encoded as raw BSON.Binary. Parse it to JSON.
              var details_result = EJSON.parse(resp.body.text());

              // ACTION REQUIRED BELOW: Replace database name and collection name so it matches yours
              // ACTION REQUIRED BELOW: Make sure all fields listed below as also part of the Google API query (see queryFields variable above)
              // WHAT THIS DOES: Uses Google Places info and pushes it to MongoDB Document. This also reformats Google Places Geo info to make it GeoJSON-ready
              var collection = context.services.get("mongodb-atlas").db("mycompany").collection("mycustomers");
              collection.updateOne(
                {"_id":fullDocument._id},
                {$set:{
                  "isPopulatedOnGoogle":true,
                  "populatedOn":Date(),
                  "sendToElasticSearch": true,
                  "googlePlaceInfo.name":details_result.result.name,
                  "googlePlaceInfo.place_id":details_result.result.place_id,
                  "googlePlaceInfo.geometry":details_result.result.geometry,
                  "googlePlaceInfo.formatted_address":details_result.result.formatted_address,
                  "googlePlaceInfo.international_phone_number":details_result.result.international_phone_number,
                  "googlePlaceInfo.formatted_phone_number":details_result.result.formatted_phone_number,
                  "googlePlaceInfo.rating":details_result.result.rating,
                  "googlePlaceInfo.type":details_result.result.type,
                  "googlePlaceInfo.vicinity":details_result.result.vicinity,
                  "googlePlaceInfo.website":details_result.result.website,
                  "googlePlaceInfo.opening_hours":details_result.result.opening_hours,
                  "googlegeoJSONcoordinates.type":"Point"},
                  $push:{ "googlegeoJSONcoordinates.coordinates" : {$each:
                    [details_result.result.geometry.location.lng,
                    details_result.result.geometry.location.lat]}}
                  });
          });
    });
};
