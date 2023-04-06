# mizar_api
* A remote verification environment for Mizar via Web API.
# memo
* This API is currently under development.
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
    http://localhost:3000/api/v1/verifier/{ID}
  * response
 
    |Parameter|Content|
    |:---:|:---:|
    |progressPhase|Current verification phase|
    |progressPercent|Percentage of progress in the current verification phase|
    |isMakeenvFinish|Makeenv exit judgment|
    |isMakeenvSuccess|Success determination of makeenv|
    |isVerifierFinish|Verifier exit judgment|
    |isVerifierSuccess|Success determination of verifier|
    |numOfErrors|Number of errors|
    |errorFile|Error File Contents|
    |makeenvText|String with mizar version, etc.|
    
