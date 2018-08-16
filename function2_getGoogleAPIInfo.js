exports = function(changeEvent) {

  // WHAT THIS DOES: Extract changeEvent full document into a usable variable
  var fullDocument = changeEvent.fullDocument;

  // ACTION REQUIRED BELOW: edit the list of Google Places fields you are interested in. See documentation for full list.
  // Be careful, since those fields are also listed under the update routine of the MongoDB document below. All fields that are updated under the below routine should be present in the below query
  queryFields = "formatted_address,geometry,name,place_id,type,vicinity,formatted_phone_number,international_phone_number,opening_hours,website,rating";

  // ACTION REQUIRED BELOW: Replace "GooglePlacesAPIKey" by the name of the Stitch Value you are using for your Google API Key.
  // Alternatively, replace context.values.get("GooglePlacesAPIKey") by your API Key if you are not using Stitch Value.
  // WHAT THIS DOES: Compose Google Place searchable URL and set it to return a JSON document with only the Place ID
  GooglePlacesURL ="https://maps.googleapis.com/maps/api/place/details/json?placeid="+fullDocument.googlePlaceID+"&fields="+queryFields+"&key="+context.values.get("GooglePlacesAPIKey");

  // ACTION REQUIRED BELOW: Replace "GooglePlaces" by the name of the Stitch HTTP GET Service you created.
  const http = context.services.get("GooglePlaces");
  return http
    .get({url: GooglePlacesURL})
    .then(resp=>{
      // The response body is encoded as raw BSON.Binary. Parse it to JSON.
        var as_json = EJSON.parse(resp.body.text());

        // ACTION REQUIRED BELOW: Replace database name and collection name so it matches yours
        // ACTION REQUIRED BELOW: Make sure all fields listed below as also part of the Google API query (see queryFields variable above)
        // WHAT THIS DOES: Uses Google Places info and pushes it to MongoDB Document. This also reformats Google Places Geo info to make it GeoJSON-ready
        var collection = context.services.get("mongodb-atlas").db("mycompany").collection("mycustomers");
        collection.updateOne(
          {"_id":fullDocument._id},
          {$set:{
            "isPopulatedOnGoogle":"Yes",
            "googlePlaceInfo.name":as_json.result.name,
            "googlePlaceInfo.place_id":as_json.result.place_id,
            "googlePlaceInfo.geometry":as_json.result.geometry,
            "googlePlaceInfo.formatted_address":as_json.result.formatted_address,
            "googlePlaceInfo.international_phone_number":as_json.result.international_phone_number,
            "googlePlaceInfo.formatted_phone_number":as_json.result.formatted_phone_number,
            "googlePlaceInfo.rating":as_json.result.rating,
            "googlePlaceInfo.type":as_json.result.type,
            "googlePlaceInfo.vicinity":as_json.result.vicinity,
            "googlePlaceInfo.website":as_json.result.website,
            "googlegeoJSONcoordinates.type":"Point"},
            $push:{ "googlegeoJSONcoordinates.coordinates" : {$each:
              [as_json.result.geometry.location.lng,
              as_json.result.geometry.location.lat]}}
            });
        return as_json.description;
    });

};
