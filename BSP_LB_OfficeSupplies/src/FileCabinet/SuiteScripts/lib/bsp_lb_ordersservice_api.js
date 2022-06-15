/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_utils.js', './bsp_lb_service_api.js', 'N/xml'],
 function (BSPLBUtils, BSPLBServiceAPI, xml){


    /**
     * Returns LogicBlock Orders from Orders Service API
     * @param {*} - integrationSettingsRecID
    */
    function getOrders(integrationSettingsRecID){
        let lbOrdersResultObj = {};
            
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);

        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_get_orders_soap_action;

        let loginData = BSPLBServiceAPI.login(settings);
        lbOrdersResultObj.loginData = loginData;
        
        let lastRuntimeExecution = settings.custrecord_bsp_lb_last_runtime_exec;
        let startDate = null;
        let endDate = new Date().toISOString();
        if(lastRuntimeExecution){
            startDate = lastRuntimeExecution;
        }
        let startIndex = BSPLBUtils.serverConstants().startIndex;
        let pageSize = BSPLBUtils.serverConstants().pageSize;

        let orders = [];
        let requestBodyXML = getOrdersXMLStrRequest(loginData, startDate, endDate, startIndex, pageSize);

        log.debug("getOrders", {requestBodyXML});

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
        BSPLBUtils.createServiceLog(
            serviceURL, 
            soapGetOrdersAction, 
            requestBodyXML, 
            logicBlockServerResponse.code, 
            logicBlockServerResponse.headers, 
            (logicBlockServerResponse.body).substring(0, 100000)
        );

        let lbOrdersResult = null;
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            lbOrdersResult = parseOrdersResponseXml(logicBlockServerResponse.body);

            orders = orders.concat(lbOrdersResult.ordersList);

            let totalOrders = lbOrdersResult.totalOrders; 

            /*if(totalOrders > pageSize){
                let totalRequests = parseInt(totalOrders / pageSize);
                let reqIndex = 1;

                while(reqIndex <= totalRequests){
                    let requestBodyXML = getOrdersXMLStrRequest(loginData, reqIndex, pageSize);
                    let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
                    BSPLBUtils.createServiceLog(
                        serviceURL, 
                        soapGetOrdersAction, 
                        requestBodyXML, 
                        logicBlockServerResponse.code, 
                        logicBlockServerResponse.headers, 
                        (logicBlockServerResponse.body).substring(0, 100000)
                    );

                    if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
                        lbOrdersResult = parseOrdersResponseXml(logicBlockServerResponse.body);
                        orders = orders.concat(lbOrdersResult.ordersList);
                    }else{
                        lbOrdersResultObj.lbOrders = null;
                        lbOrdersResultObj.error = logicBlockServerResponse;
                        lbOrdersResultObj.errorMessage = logicBlockServerResponse.body;
                        break;
                    }
                    reqIndex++;
                }
            }*/

            lbOrdersResultObj.lbOrders = orders;
        }else{
            lbOrdersResultObj.lbOrders = null;
            lbOrdersResultObj.error = logicBlockServerResponse;
            lbOrdersResultObj.errorMessage = logicBlockServerResponse.body;
        }

        return lbOrdersResultObj;
    }
   
    /**
     * Body of Order Request
     * @returns 
     */
     function getOrdersXMLStrRequest(loginData, startDate, endDate, startIndex, pageSize){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:GetOrdersByCriteria>
                            <tem:token>
                                <log:ApiId>${loginData.ApiId}</log:ApiId>
                                <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                                <log:Id>${loginData.Id}</log:Id>
                                <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                                <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                            </tem:token>
                            <tem:criteria>
                                <log:StartDate>${startDate}</log:StartDate>
                                <log:EndDate>${endDate}</log:EndDate>
                                <log:ExcludeCanceledOrders>true</log:ExcludeCanceledOrders>
                            </tem:criteria>
                            <tem:startIndex>${startIndex}</tem:startIndex>
                            <tem:pageSize>${pageSize}</tem:pageSize>
                        </tem:GetOrdersByCriteria>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }


    /**
     * Parse XML response from Get Orders request
     * @param {*} xmlStr 
     * @returns 
    */
    function parseOrdersResponseXml(xmlStr){
        let objOrdersResult = {};

        var xmlDocument = xml.Parser.fromString({
            text: xmlStr
        });

        let jsonObj = BSPLBUtils.xmlToJson(xmlDocument.documentElement);
        let totalOrders = BSPLBUtils.getTotalOrdersAttributeFromJSON(jsonObj);
        let ordersList = [];
        ordersList = BSPLBUtils.getOrdersAttributeFromJSON(jsonObj);
        let ordersStr = JSON.stringify(ordersList).replaceAll("a:","");
        ordersStr = ordersStr.replaceAll('"@attributes":{}',"");
        ordersList = JSON.parse(ordersStr).Order;

        objOrdersResult = {
            totalOrders: totalOrders,
            ordersList: ordersList
        }
        return objOrdersResult;
    }


    return {
        getOrders: getOrders
    };
});