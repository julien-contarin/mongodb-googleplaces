exports = function(changeEvent) {

  // WHAT THIS DOES: Extract changeEvent full document into a usable variable
  var fullDocument = changeEvent.fullDocument;

  // ACTION REQUIRED BELOW: Replace "name" by whatever field name you are using to contain the searchable business name information
  // WHAT THIS DOES: The field "name" probably contains spaces. The following makes it usable as a URL by replacing spaces by %20.
  searchableName = encodeURIComponent(fullDocument.name.trim());

  // ACTION REQUIRED BELOW: Replace "GooglePlacesAPIKey" by the name of the Stitch Value you are using for your Google API Key.
  // Alternatively, replace context.values.get("GooglePlacesAPIKey") by your API Key if you are not using Stitch Value.
  // WHAT THIS DOES: Compose Google Place searchable URL and set it to return a JSON document with only the Place ID
  GooglePlacesURL ="https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input="+searchableName+"&inputtype=textquery&fields=place_id&key="+context.values.get("GooglePlacesAPIKey");

  // ACTION REQUIRED BELOW: Replace "GooglePlaces" by the name of the Stitch HTTP GET Service you created.
  const http = context.services.get("GooglePlaces");
  return http
    .get({url: GooglePlacesURL})
    .then(resp=>{
      // The response body is encoded as raw BSON.Binary. Parse it to JSON.
        var as_json = EJSON.parse(resp.body.text());

        // ACTION REQUIRED BELOW: Replace database name and collection name so it matches yours
        // WHAT THIS DOES: Get the collection and update the document with the place_id from Google Places API
        // Candidates is a list of Google Places that is sent by Google API as a response to our query. We take the first result of the search (hence the syntax candidates[0])
        var collection = context.services.get("mongodb-atlas").db("mycompany").collection("mycustomers");
        collection.updateOne(
          {"_id":fullDocument._id},
          {$set:{
            "googlePlaceID":as_json.candidates[0].place_id
          }});

        return as_json.description;
    });

};
