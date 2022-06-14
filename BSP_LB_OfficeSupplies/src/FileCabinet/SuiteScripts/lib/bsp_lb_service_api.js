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
    function login(){

        let requestBodyXML = getLoginXMLStrRequest();

        log.debug("login", {requestBodyXML});

        let logicBlockServerResponse = http.request({
            "method":  http.Method.POST,
            "url": "http://theofficecity.7cart.com/api/OrdersService.svc",
            "body": requestBodyXML,
            "headers": {
                "Content-Type": "text/xml",
                "SOAPAction": BSPLBUtils.serverConstants().loginAction
            }
        });

        log.debug("login", JSON.stringify({body:logicBlockServerResponse}));

        let loginData = {};
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            loginData = parseLoginResponseXml(logicBlockServerResponse.body);
        }
        return loginData;
    }


    /**
     * Body of Login Request
     * @returns 
     */
    function getLoginXMLStrRequest(){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:Login>
                            <tem:username>mcasaretto@bspny.com</tem:username>
                            <tem:password>mcasaretto@bspny.com</tem:password>
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

        log.debug("parseResponseXml", JSON.stringify(responseObj));
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
        login: login
    };
    
});