[README日本語版](https://github.com/cIel104/mizar_api/blob/main/README-ja.md)
# mizar_api


* A remote verification environment for Mizar via Web API.
# memo
* This API is currently under development.
* ~~Please clone the repository directly under the C drive.(To be revised)~~
* The response data is only in JSON.
* Please fork the [mizar_repository](https://github.com/cIel104/mizar_repository) and create a "verifier" branch.
# Features
* API for executing a verification program.
  * request(POST)  
  Please specify a JSON-formatted string in the request body.  
    http://localhost:3000/api/v0.1/verifier
  
    |Parameter|Content|
    |:---:|:---:|
    |fileName|Mizar File Name|
    |repositoryUrl|The URL of the GitHub repository containing the Mizar file|
    |command|Command to verify|
  * response
  
    |Parameter|Content|
    |:---:|:---:|
    |ID|DB Index|
* API for obtaining verification results.
  * request(GET)  
  Please input the ID in the path parameter.  
    http://localhost:3000/api/v0.1/verifier/{ID}
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
    |errorList|An array containing the line number, column number, error type, and error message|
    |makeenvText|String with mizar version, etc.|
    |queueNum|Order in Queue|

* API to interrupt the verification program.
  * request(DELETE)  
  Please input the ID in the path parameter.  
    http://localhost:3000/api/v0.1/verifier/{ID}
  * response

    |Parameter|Content|
    |:---:|:---:|
    |message|Deletion result|
    
* API for format.
  * request(POST)  
  Please specify a JSON-formatted string in the request body.  
    http://localhost:3000/api/v0.1/formatter
  
    |Parameter|Content|
    |:---:|:---:|
    |fileName|Mizar File Name|
    |repositoryUrl|The URL of the GitHub repository containing the Mizar file|
    |settings|User settings regarding the format|
  * response
    
    |Parameter|Content|
    |:---:|:---:|
    |fileContent|Indented Mizar file content|
    |isFormatterSuccess|Success determination of format|
    |errorLog|error log|
