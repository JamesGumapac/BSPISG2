/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_utils.js', './bsp_lb_service_api.js', 'N/http', 'N/xml'],
 function (BSPLBUtils, BSPLBServiceAPI, http, xml){


    /**
     * Returns LogicBlock Orders from Orders Service API
     * @param {*} - integrationSettingsRecID
    */
    function getOrders(){
        let lbOrdersResultObj = [];
            
        let loginData = BSPLBServiceAPI.login();
        lbOrdersResultObj.loginData = loginData;
        
        let requestBodyXML = getOrdersXMLStrRequest(loginData);

        log.debug("getOrders", {requestBodyXML});

        let logicBlockServerResponse = http.request({
            "method":  http.Method.POST,
            "url": "http://theofficecity.7cart.com/api/OrdersService.svc",
            "body": requestBodyXML,
            "headers": {
                "Content-Type": "text/xml",
                "SOAPAction": BSPLBUtils.serverConstants().getOrdersAction
            }
        });

        log.debug("getOrders", JSON.stringify({logicBlockServerResponse}));

        let lbOrdersResult = null;
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            lbOrdersResult = parseOrdersResponseXml(logicBlockServerResponse.body);
            lbOrdersResultObj.lbOrders = lbOrdersResult;
        }else{
            lbOrdersResultObj.lbOrders = null;
            lbOrdersResultObj.error = logicBlockServerResponse.body;
        }

        return lbOrdersResultObj;
    }


    
    /**
     * Body of Login Request
     * @returns 
     */
     function getOrdersXMLStrRequest(loginData){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:GetOrdersReadyForThirdParty>
                            <tem:token>
                                <log:ApiId>${loginData.ApiId}</log:ApiId>
                                <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                                <log:Id>${loginData.Id}</log:Id>
                                <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                                <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                            </tem:token>
                            <tem:ordersReadyForThirdPartyParams>
                                <log:DownloadStartDate>2022-05-01</log:DownloadStartDate>
                                <log:NumberOfDays>100</log:NumberOfDays>
                            </tem:ordersReadyForThirdPartyParams>
                            <tem:startIndex>0</tem:startIndex>
                            <tem:pageSize>10</tem:pageSize>
                        </tem:GetOrdersReadyForThirdParty>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }


    /**
     * Parse XML response from Get Orders request
     * @param {*} xmlStr 
     * @returns 
    */
    function parseOrdersResponseXml(xmlStr){
        let responseObj = {};

        var xmlDocument = xml.Parser.fromString({
            text: xmlStr
        });

        let jsonObj = BSPLBUtils.xmlToJson(xmlDocument.documentElement);
        let ordersList = BSPLBUtils.getOrdersAttributeFromJSON(jsonObj);
        log.debug("parseOrdersResponseXml", JSON.stringify(ordersList));
        responseObj =  parseOrders(ordersList);
        return responseObj;
    }

    /**
     * Parse API response
     * @param {*} ordersList 
     */
    function parseOrders(ordersList){
        let orders = [];

    }

    return {
        getOrders: getOrders
    };
});