/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_utils.js', 'N/http', 'N/xml'],
 function (BSPLBUtils, http, xml){

   /**
    * Login request
    * @returns 
    */
    function login(integrationSettings){

        let userID = integrationSettings.custrecord_bsp_lb_user_id;
        let password = integrationSettings.custrecord_bsp_lb_password;

        let serviceURL = integrationSettings.custrecord_bsp_lb_orders_service_url;
        let soapLoginAction = integrationSettings.custrecord_bsp_lb_login_soap_action;

        let requestBodyXML = getLoginXMLStrRequest(userID, password);

        log.debug("login", {requestBodyXML});

        let logicBlockServerResponse = runService(serviceURL, requestBodyXML, soapLoginAction);

        BSPLBUtils.createServiceLog(
            serviceURL, 
            soapLoginAction, 
            requestBodyXML, 
            logicBlockServerResponse.code, 
            logicBlockServerResponse.headers, 
            (logicBlockServerResponse.body).substring(0, 100000)
        );

        let loginData = {};
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            loginData = parseLoginResponseXml(logicBlockServerResponse.body);
        }
        return loginData;
    }

    /**
     * Execute HTTP request
     * @param {*} serviceURL 
     * @param {*} requestBodyXML 
     * @param {*} soapAction 
     * @returns 
     */
    function runService(serviceURL, requestBodyXML, soapAction){
        return http.request({
            "method":  http.Method.POST,
            "url": serviceURL,
            "body": requestBodyXML,
            "headers": {
                "Content-Type": "text/xml",
                "SOAPAction": soapAction
            }
        });
    }

    /**
     * Body of Login Request
     * @returns 
     */
    function getLoginXMLStrRequest(userID, password){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:Login>
                            <tem:username>${userID}</tem:username>
                            <tem:password>${password}</tem:password>
                        </tem:Login>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }

    /**
     * Parse XML response from login request
     * @param {*} xmlStr 
     * @returns 
     */
    function parseLoginResponseXml(xmlStr){
        let responseObj = {};
 
        let xmlDocument = xml.Parser.fromString({
            text: xmlStr
        });

        if(!BSPLBUtils.isEmpty(xmlDocument)){
            responseObj = {
                ApiId: getTagText(xml.XPath.select({node: xmlDocument,xpath: '//a:ApiId'})),
                ExpirationDateUtc: getTagText(xml.XPath.select({node: xmlDocument,xpath: '//a:ExpirationDateUtc'})),
                Id: getTagText(xml.XPath.select({node: xmlDocument,xpath: '//a:Id'})),
                IsExpired: getTagText(xml.XPath.select({node: xmlDocument,xpath: '//a:IsExpired'})),
                TokenRejected: getTagText(xml.XPath.select({node: xmlDocument,xpath: '//a:TokenRejected'})),
            };
        }
        return responseObj;
    }

    /**
     * getTagText: retrieves text content of an xml element
     * @param  {String} element
     * @param  {String} tagName
     * @return {String}
    */
    function getTagText(element) {   
        let elem = element[0];   
        return !BSPLBUtils.isEmpty(elem) ? elem.textContent : null;
    }

    return {
        login: login,
        runService: runService
    };
    
});