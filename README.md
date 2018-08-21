# Enrich MongoDB data with Google Places


## Purpose

This is an integration of MongoDB with Google Place API Data. This integration is generated from MongoDB Atlas data that contains information about businesses (hotels, taxis, restaurants, hospitals). The main idea is to automatically enrich this data with up to date information from Google Places API, so you don't have to maintain their business information (address, phone number, opening hours, ratings).

These are the versions with which this application has been created and tested:
* MongoDB 4.0.0 running on **AWS Europe (Frankfurt)**
* MongoDB Stitch running on **AWS US East 1**

Created: *August 16, 2018*

Last Updated: *August 21, 2018*


## Disclaimer

This application is **NOT** an official MongoDB product or project.

This is a MVP-type of application built to better materialize some of the benefits that MongoDB Stitch can bring to developers. One of the promises of Stitch is to go faster to MVP and this application, although possibly buggy and brittle, will show just how easy it is to bring new ideas to life using the concept of serverless platform envisioned by Stitch. In just a few lines of code, and without having to host anything on-prem, we are able to automatically enrich MongoDB data to make it more valuable to our business users.


## Creator

* Julien Contarin - Solutions Architect at MongoDB


## Description

This application uses MongoDB Stitch to automatically fetch business data when MongoDB documents are created, updated or replaced.

The application does two things sequentially, using a trigger and http get service:
1. if the business is referenced on Google, get business ID from Google Places API (get first search result using business name)
2. once we have business ID, populate MongoDB document with as much info as needed from said business from Google (address, phone number, opening hours, ratings)

Businesses that are not found will go through step 1 and will remain unchanged.


## Prerequisites

Run a MongoDB Atlas instance (M0/free tier is enough for sandboxing, up to 512 MB)
* Create an account on cloud.mongodb.com
* Select Create Cluster and deploy the Cluster

Prepare a Google API Key using your GCP account
* Create an account on console.cloud.google.com
* Create a new Project
* Go to APIs & Services > Credentials > Create > API Key > Enable your API Key for Google Places API

See documentation:
* MongoDB Stitch: https://docs.mongodb.com/stitch/
* Google Place Search: https://developers.google.com/places/web-service/search
* Google Place Details: https://developers.google.com/places/web-service/details


## Document structure

Documents located in your collection should follow these guidelines:
* "name": a field used to make the Google Place search. This should contain an intelligible business name. Hint: a manual Google Search using "name" should return the business you are looking for. Examples of valid names: "Empire State Building";
* "isReferencedOnGoogle": somewhere in your business logic, you should add a flag about whether or not you want this particular business to be enriched using Google Places data. Could be a boolean or a string containing "Yes"/"No" (this documentation uses a boolean)


## Build

### a. Initialize Stitch Application

1. Go to Stitch on the left-hand panel of MongoDB Atlas interface
2. Create a new application and name it (e.g. GoogleAPIIntegration)
3. Enable Anonymous Authentication
4. Under Initialize a MongoDB Collection, add the collection where your business data will be (e.g. database mycompany, collection mycustomers)
*NB: note that this app is designed so existing data will not be impacted, only added/updated data will be enriched with Google Places data*
5. Under the Rules panel, edit Permissions to use no template, then enable Permissions for your data to be Read/Write for Stitch "default" user profile
6. Under the Services panel
    * Follow Add a Service and select HTTP
    * Name it "GooglePlaces"
    * Add Incoming webhook
    * Add a name e.g. WH_GP, Use GET, Select Require Secret as Query Parameter and set your secret.
    * Leave everything else as default (including Function Editor) and save your HTTP Service
7. Under the Values panel, create a new Value for your Google API Key so it can be used across your triggers and functions. Call it GooglePlacesAPIKey

### b. Function - getGooglePlaceInfo

1. Start with creating a new trigger:
    * Triggers panel
    * "Add Trigger"
    * Name it getGooglePlaceInfo and enable it
    * Trigger source details is your source collection, mycompany / mycustomers
    * Operation type is Insert/Update/Replace
    * Enable Full Document
    * Create a new linked Function and call it getGooglePlaceInfo
2. Advanced trigger options (**Very important**): the current design is made so the source and the destination collections impacted by the Stitch triggers are the same. Therefore, to avoid infinite loops, we must add indicators saying this Document has been processed. Add Match expression filter as follows.     
```
        { "fullDocument.name":{"$exists":true},
          "fullDocument.isReferencedOnGoogle":true,
          "fullDocument.googlePlaceInfo":{"$exists":false}}
```
3. Edit getGooglePlaceInfo function using the *function.getGooglePlaceInfo.js* file attached to this Github project (see **ACTION REQUIRED BELOW** comments in function body for guidance). Once you have made your updates, copy-paste in your Stitch function and save it.


## Test

1. To test this, connect to MongoDB Shell
2. Set the database: use *mycompany*
3. Perform:
```
        db.mycustomers.insert({"isReferencedOnGoogle":true,"name": "Empire State Building"})
```
4. After a few seconds, perform the following on the Shell (alternatively: use Compass with query *{name:"Empire State Building"}*):
```
        db.mycustomers.find({name:"Empire State Building"}).pretty()
```
5. The result should look like (extract for brievity purpose):
```
      {
        "isReferencedOnGoogle" : "Yes",
        "name" : "Empire State Building",
	      "googlePlaceID" : "ChIJaXQRs6lZwokRY6EFpJnhNNE",
	      "googlePlaceInfo" : {
		      "formatted_address" : "350 5th Ave, New York, NY 10118, USA",
		      "formatted_phone_number" : "(212) 736-3100",
		      "rating" : 4.6,
          "opening_hours": [...],
		      [...]
	         },
      	"googlegeoJSONcoordinates" : {
      		"coordinates" : [
      			-73.98566439999999,
      			40.7484405
      		],
      		"type" : "Point"
      	},
	      "populatedOn" : "Tue, 21 Aug 2018 09:02:47 UTC"
      }
```


## Run

### Performance considerations

1. Stitch Triggers currently execute in-order (first in) for the records as they are inserted, at a rate of up to 50 triggers /s.  If you are working with bulk inserts, and loading 2,000 records per second for 30 seconds the corresponding triggers would execute for 20+ minutes. This time also depends on the latency between your Atlas region and the Stitch region, because it impacts the individual runtime of each Stitch trigger + associated function.

2. If you are editing documents/batching operations on the same documents then it is possible to receive a stale version of the document.

3. At the date this is being written, Stitch runs only in AWS US East 1. Consider latency between your Atlas region and this region to optimize throughput. Specifically, this will run best with Atlas clusters that are running on AWS in the US or in Western Europe.


## Update Google Places information

As stated in section b, right now Google API integration is rather static and only gets triggered when documents are Inserted, Updated or Replaced AND their content miss certain fields. This is to avoid infinite loops updating the same documents over and over.

Here are ways which you can trigger a Google Places information update:
* Anytime the "name" field is updated, you should consider performing a full $unset of fields populated by Google Places. This will avoid discrepancies between the current name and associated business information.
* On a regular basis or on any update of the document, it can be worth retriggering
* When this business Google Places info has not changed for 6 months, you may recheck

Below is an example routine that will trigger a Google Places API population. Make sure to unset googlegeoJSONcoordinates as the $push operator will otherwise cumulate multiple sets of coordinates within the same array:
```
        db.mycustomers.updateOne({}, {$unset:{googlePlaceInfo:"",googlegeoJSONcoordinates:""}})
```

## Future improvements

* The above *Update Google Places information* section could itself be done as a Trigger on Stitch, auto-checking MongoDB documents for health of their Google API up-to-dateness and accuracy
