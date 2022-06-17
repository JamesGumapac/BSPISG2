/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_utils.js', './bsp_lb_login_api.js', './bsp_lb_service_api.js', 'N/xml'],
 function (BSPLBUtils, BSPLBLoginAPI, BSPLBServiceAPI, xml){


    /**
     * Returns LogicBlock Orders from Orders Service API
     * @param {*} - integrationSettingsRecID
    */
    function getOrders(integrationSettingsRecID){
        let lbOrdersResultObj = {};
            
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);

        let loginData = BSPLBLoginAPI.login(settings);
        lbOrdersResultObj.loginData = loginData;

        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_get_orders_soap_action;

        let lastRuntimeExecution = settings.custrecord_bsp_lb_last_runtime_exec;
        let startDate = null;
        let endDate = new Date().toISOString();
        if(lastRuntimeExecution){
            startDate = lastRuntimeExecution;
        }
        let startIndex = BSPLBUtils.serverConstants().startIndex;
        let pageSize = settings.custrecord_bsp_lb_orders_page_size;


        let orders = [];
        let requestBodyXML = getOrdersXMLStrRequest(loginData, startDate, endDate, startIndex, pageSize);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
        let lbOrdersResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbOrdersResult = logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.List.Order;
            if(lbOrdersResult.length > 0){
                orders = orders.concat(lbOrdersResult);
            }
            let totalOrders =  logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.TotalRows;

            /*if(totalOrders > pageSize){
                let totalRequests = parseInt(totalOrders / pageSize);
                let reqIndex = 1;

                while(reqIndex <= totalRequests){
                    let requestBodyXML = getOrdersXMLStrRequest(loginData, reqIndex, pageSize);
                    let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
                    if(logicBlockServerResponse){
                        lbOrdersResult = logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.List.Order;
                        if(lbOrdersResult.length > 0){
                            orders = orders.concat(lbOrdersResult);
                        }
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

    return {
        getOrders: getOrders
    };
});