/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/https', 'N/encode'],
 function (https, encode){


    /**
     * Returns the Body for the EDI Request
     * @param transmissionData - 
     * @returns the bodyObj object.
    */
    function buildRequestBody(transmissionData){
        let base64EncodedXMLcontent = encodeXMLContent(transmissionData.xmlFileObj.fileContent);

        let bodyObj = {
            "AS2Identifier": transmissionData.ediSettings.as2Identifier,
            "Partner": {
                "AS2Identifier": transmissionData.tradingPartner.as2Identifier,
                "MDNTo": transmissionData.tradingPartner.mdnTo,
                "TargetUrl": transmissionData.tradingPartner.targetURL,
                "CompressMessage": transmissionData.tradingPartner.compressMessage,
                "SignMessage": transmissionData.tradingPartner.signMessage,
                "SignatureAlgorithm": transmissionData.tradingPartner.signatureAlgorithm,
                "EncryptMessage": transmissionData.tradingPartner.encryptMessage,
                "EncryptionAlgorithm": transmissionData.tradingPartner.encryptionAlgorithm
            },
            "Payload": {
                "Name": transmissionData.xmlFileObj.fileName,
                "Content": base64EncodedXMLcontent,
                "EDIType": "application/xml"
            }
        };
        return bodyObj;
    }

    /**
     * It takes a string of XML content and returns a base64 encoded string.
     * @param xmlContent - The XML content that you want to encode.
     * @returns A base64 encoded string.
    */
    function encodeXMLContent(xmlContent){
        let base64EncodedString = encode.convert({
            string: xmlContent,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
        });
        return base64EncodedString;
    }

    /**
     * Execute HTTPS request
     * @param {*} serviceURL 
     * @param {*} requestBodyXML 
     * @param {*} soapAction 
     * @returns 
     */
    function runService(ediSettings, requestBody){
        let jsonObjResponse = null;

        let as2ServerResponse = https.request({
            "method":  https.Method.POST,
            "url": ediSettings.endpointURL,
            "body": requestBody,
            "headers": {
                'Authorization': getToken(ediSettings),
                "Content-Type": "application/json",
                "Accept": 'application/json'
            }
        });

        log.debug("runService", JSON.stringify(as2ServerResponse));

        return jsonObjResponse;
    }

    /**
     * The function takes an object with a username and password and returns a token.
     * @param ediSettings - This is the object that contains the username and password.
     * @returns The token is being returned.
    */
    function getToken(ediSettings){
        let headers = new Object();
        headers['Accept'] = 'application/x-www-form-urlencoded';
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        let url = 'https://suitebridge.azurewebsites.net/token';
        let username = ediSettings.user;
        let password = ediSettings.pwd;
        let requestBody = 'username=' + username + '&password=' + password + '&grant_type=password';
        let response = https.request({
            "method":  https.Method.POST,
            "url": url,
            "body": requestBody,
            "headers": headers
        });

        log.debug("getToken", JSON.stringify(response));

        if (response.code != 200 && response.code != 201){
            throw ('CREDENTIALS_ERROR', 'Please check your application settings credentials. Username and/or passord is incorrect.');
        }
        let tokenJsonStr = response.body;
        let tokenJSON = JSON.parse(tokenJsonStr);
        let token = 'Bearer ';
        token += tokenJSON.access_token;
        return token;
    }

    return {
        buildRequestBody: buildRequestBody,
        runService: runService
    };
    
});