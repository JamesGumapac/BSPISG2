/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_utils.js', 'N/http', 'N/xml', './xmlTojson.js'],
 function (BSPLBUtils, http, xml, parser){

    /**
     * Execute HTTP request
     * @param {*} serviceURL 
     * @param {*} requestBodyXML 
     * @param {*} soapAction 
     * @returns 
     */
    function runService(serviceURL, requestBodyXML, soapAction){
        let logicBlockServerResponse = http.request({
            "method":  http.Method.POST,
            "url": serviceURL,
            "body": requestBodyXML,
            "headers": {
                "Content-Type": "text/xml",
                "SOAPAction": soapAction
            }
        });

        BSPLBUtils.createServiceLog(
            serviceURL, 
            soapAction, 
            requestBodyXML, 
            logicBlockServerResponse.code, 
            logicBlockServerResponse.headers, 
            (logicBlockServerResponse.body).substring(0, 100000)
        );

        let jsonObjResponse = {};
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            jsonObjResponse = parseResponseXml(logicBlockServerResponse.body);
        }
        return jsonObjResponse;
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
        let jsonStr = JSON.stringify(jsonObj).replaceAll("a:","");
        jsonStr = jsonStr.replaceAll("s:","");
        jsonObj = JSON.parse(jsonStr).Body;
        return jsonObj;
    }

    return {
        runService: runService
    };
    
});