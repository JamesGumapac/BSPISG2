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

        let requestParams = getOrdersRequestParams(settings);

        let orders = [];
        let requestBodyXML = getOrdersXMLStrRequest(loginData, requestParams);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
        let lbOrdersResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbOrdersResult = logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.List.Order;
            if(lbOrdersResult.length > 0){
                orders = orders.concat(lbOrdersResult);
            }else if(!BSPLBUtils.isEmpty(lbOrdersResult)){
                orders.push(lbOrdersResult);
            }

            let totalOrders =  logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.TotalRows;
            let pageSize = settings.custrecord_bsp_lb_orders_page_size;

            if(totalOrders > pageSize){
                let totalRequests = parseInt(totalOrders / pageSize);
                let reqIndex = 1;

                while(reqIndex <= totalRequests){
                    let requestBodyXML = getOrdersXMLStrRequest(loginData, reqIndex, pageSize);
                    let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
                    if(logicBlockServerResponse){
                        lbOrdersResult = logicBlockServerResponse.GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult.List.Order;
                        if(lbOrdersResult.length > 0){
                            orders = orders.concat(lbOrdersResult);
                        }else if(!BSPLBUtils.isEmpty(lbOrdersResult)){
                            orders.push(lbOrdersResult);
                        }
                    }else{
                        lbOrdersResultObj.lbOrders = null;
                        lbOrdersResultObj.error = logicBlockServerResponse;
                        lbOrdersResultObj.errorMessage = logicBlockServerResponse.body;
                        break;
                    }
                    reqIndex++;
                }
            }

            lbOrdersResultObj.lbOrders = orders;
        }else{
            lbOrdersResultObj.lbOrders = null;
            lbOrdersResultObj.error = logicBlockServerResponse;
            lbOrdersResultObj.errorMessage = logicBlockServerResponse.body;
        }

        return lbOrdersResultObj;
    }
   
    /**
     * Get Paramters for the Logicblock Service request
     * @param {*} settings 
     * @returns 
     */
    function getOrdersRequestParams(settings){
        let lastRuntimeExecution = settings.custrecord_bsp_lb_last_runtime_exec;
        let startDate = null;
        let endDate = new Date().toISOString();
        if(lastRuntimeExecution){
            startDate = lastRuntimeExecution;
        }
        let startIndex = BSPLBUtils.serverConstants().startIndex;
        let pageSize = settings.custrecord_bsp_lb_orders_page_size;
        let canceledOrders = settings.custrecord_bsp_lb_exclude_canceled_ord;

        return {
            startDate: startDate,
            endDate: endDate,
            startIndex: startIndex,
            pageSize: pageSize,
            canceledOrders: canceledOrders
        };
    }

    /**
     * Body of Order Request
     * @returns 
     */
     function getOrdersXMLStrRequest(loginData, requestParams){
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
                                <log:StartDate>${requestParams.startDate}</log:StartDate>
                                <log:EndDate>${requestParams.endDate}</log:EndDate>
                                <log:ExcludeCanceledOrders>${requestParams.canceledOrders}</log:ExcludeCanceledOrders>
                            </tem:criteria>
                            <tem:startIndex>${requestParams.startIndex}</tem:startIndex>
                            <tem:pageSize>${requestParams.pageSize}</tem:pageSize>
                        </tem:GetOrdersByCriteria>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }

    return {
        getOrders: getOrders
    };
});