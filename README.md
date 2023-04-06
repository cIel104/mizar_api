# mizar_api
* A remote verification environment for Mizar via Web APIs
# memo
* Please clone the repository directly under the C drive.
* The response data is only in JSON.
# Features
* API for executing a verification program.
  * request  
  Please specify a JSON-formatted string in the request body.
  
    |Parameter|Content|
    |:---:|:---:|
    |fileName|Mizar File Name|
    |fileContent|Mizar file contents|
  * response
  
    |Parameter|Content|
    |:---:|:---:|
    |ID|DB Index|
* API for obtaining verification results.
  * request  
  Please input the ID in the path parameter.

  * response
