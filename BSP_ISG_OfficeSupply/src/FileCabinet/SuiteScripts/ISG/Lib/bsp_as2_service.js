/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/https', 'N/encode', './xmlTojson.js', 'N/xml', './bsp_transmitions_util.js'],
 function (https, encode, parser, xml, BSPTransmitionsUtil){

    /**
     * Returns the Body for the AS2 Request
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
     * It takes a base64 encoded string and returns its XML String content.
     * @param stringContent - A base64 encoded string that you want to encode.
     * @returns The XML content string.
    */
    function decodeStringContent(stringContent){
        let xmlDecodedString = encode.convert({
            string: stringContent,
            inputEncoding: encode.Encoding.BASE_64,
            outputEncoding: encode.Encoding.UTF_8
        });
        return xmlDecodedString;
    }

    /**
     * The function takes in an object containing the settings for the AS2 service, and a string containing
     * the JSON request body, and returns a JSON object containing the response from the AS2 service.
     * @param ediSettings - This is a custom record that contains the connection info
     * @param requestBody - Request body in JSON format
     * @returns The response from the server.
    */
    function runService(data){
        let headers = new Object();
        headers['Authorization'] = getToken(data.ediSettings);
        headers['Accept'] = 'application/json';
        headers['Content-Type'] = 'application/json';

        let as2ServerResponse = https.request({
            "method":  data.httpMethod,
            "url": data.ediSettings.endpointURL,
            "body": JSON.stringify(data.serverBodyParameters),
            "headers": headers
        });

        log.debug("runService", JSON.stringify(as2ServerResponse));

        BSPTransmitionsUtil.createServiceLog(
            data.ediSettings.endpointURL, 
            data.httpMethod, 
            JSON.stringify(data.serverBodyParameters), 
            as2ServerResponse.code, 
            as2ServerResponse.headers, 
            (as2ServerResponse.body).substring(0, 100000)
        );

        return as2ServerResponse;
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

    
    /**
     * Parse XML response from request
     * @param {*} xmlStr 
     * @returns 
    */
     function parseResponseXml(xmlStr){
        var xmlDocument = xml.Parser.fromString({
            text: xmlStr
        });
        let jsonObj = parser.xmlToJson(xmlDocument.documentElement);
        let jsonStr = JSON.stringify(jsonObj).replaceAll("us:","");
        jsonStr = jsonStr.replaceAll("oa:","");
        jsonObj = JSON.parse(jsonStr);
        return jsonObj;
    }

    return {
        buildRequestBody: buildRequestBody,
        runService: runService,
        decodeStringContent: decodeStringContent,
        parseResponseXml: parseResponseXml
    };
    
});