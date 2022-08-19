/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/http', ],
 function (http){


    function buildRequestBody(transmissionData){
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
                "Name": "sample string 1",
                "Content": "sample string 2",
                "EDIType": "application/xml"
            }
        };
        return bodyObj;
    }


    /**
     * Execute HTTP request
     * @param {*} serviceURL 
     * @param {*} requestBodyXML 
     * @param {*} soapAction 
     * @returns 
     */
    function runService(serviceURL, requestBodyXML, soapAction){
        let jsonObjResponse = null;

        let as2ServerResponse = http.request({
            "method":  http.Method.POST,
            "url": serviceURL,
            "body": requestBodyXML,
            "headers": {
                "Content-Type": "text/xml",
                "SOAPAction": soapAction
            }
        });

        return jsonObjResponse;
    }

    return {
        buildRequestBody: buildRequestBody,
        runService: runService
    };
    
});