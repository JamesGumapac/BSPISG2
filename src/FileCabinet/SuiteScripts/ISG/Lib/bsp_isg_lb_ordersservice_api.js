/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_isg_lb_utils.js', './bsp_isg_lb_login_api.js', './bsp_isg_lb_service_api.js'],
 function (BSPLBUtils, BSPLBLoginAPI, BSPLBServiceAPI){

    /**
     * Returns LogicBlock Orders from Orders Service API
     * @param {*} integrationSettingsRecID
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
        let requestBodyXML = getOrdersXMLStrRequest(loginData, requestParams, requestParams.startIndex,  requestParams.pageSize);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
        let lbOrdersResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbOrdersResult = logicBlockServerResponse.GetOrdersReadyForThirdPartyResponse.GetOrdersReadyForThirdPartyResult.List.Order;
            if(!BSPLBUtils.isEmpty(lbOrdersResult)){
                if(lbOrdersResult.length > 0){
                    orders = orders.concat(lbOrdersResult);
                }else{
                    orders.push(lbOrdersResult);
                }
            }         

            let totalOrders =  logicBlockServerResponse.GetOrdersReadyForThirdPartyResponse.GetOrdersReadyForThirdPartyResult.TotalRows;
            let pageSize = settings.custrecord_bsp_lb_orders_page_size;

            if(totalOrders > pageSize){
                let totalRequests = parseInt(totalOrders / pageSize);
                let reqIndex = 1;

                while(reqIndex <= totalRequests){
                    let requestBodyXML = getOrdersXMLStrRequest(loginData, requestParams, reqIndex, pageSize);
                    let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        
                    if(logicBlockServerResponse){
                        lbOrdersResult = logicBlockServerResponse.GetOrdersReadyForThirdPartyResponse.GetOrdersReadyForThirdPartyResult.List.Order;
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
     * Create Package in Logicblock System
     * @param {*} settings 
     * @param {*} loginData
     * @param {*} shipPackageData 
     * @returns 
     */
    function createPackage(settings, loginData, shipPackageData){
        let lbPackageResultObj = {};

        lbPackageResultObj.loginData = loginData;
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapCreatePackageAction = settings.custrecord_bsp_lb_create_pkg_soap_action;

        let requestBodyXML = createPackageXMLStrRequest(loginData, shipPackageData);

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapCreatePackageAction);

        let lbPackageId = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbPackageId = logicBlockServerResponse.CreatePackageResponse.CreatePackageResult;
            lbPackageResultObj.packageId = lbPackageId;
        }
        return lbPackageResultObj;
    }

    /**
     * Ship Package to Logicblock system
     * @param {*} settings 
     * @param {*} lbPackageObj 
     * @returns 
     */
    function shipPackage(settings, lbPackageObj){
        let shipPackageResult = null;
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapShipPackageAction = settings.custrecord_bsp_lb_ship_pkg_soap_action;
        let loginData = lbPackageObj.loginData;
        let packageId = lbPackageObj.packageId;

        let requestBodyXML = shipPackageXMLStrRequest(loginData, packageId);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapShipPackageAction);

        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            shipPackageResult = logicBlockServerResponse.ShipPackageResponse.ShipPackageResult;
        }
        return shipPackageResult;
    }

    /**
     * Get order payments from Logicblock
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} logicBlockOrderID 
     * @returns 
     */
    function getOrderPayments(settings, loginData, logicBlockOrderID){
        let orderPayments = [];
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrderPaymentsAction = settings.custrecord_bsp_lb_get_pymnts_soap_action;
        let requestBodyXML = getOrderPaymentsXMLStrRequest(loginData, logicBlockOrderID);

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrderPaymentsAction);

        let lbPaymentsResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbPaymentsResult = logicBlockServerResponse.GetOrderPaymentsResponse.GetOrderPaymentsResult.OrderPayment;

            if(!BSPLBUtils.isEmpty(lbPaymentsResult)){
                if(lbPaymentsResult.length > 0){
                    orderPayments = orderPayments.concat(lbPaymentsResult);
                }else{
                    orderPayments.push(lbPaymentsResult);
                }
            }    
        }
        return orderPayments;
    }


    /**
     * Call Logicblock API to Capture Payment
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function capturePayment(settings, loginData, paymentData){
        let capturePayment = null;
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapCapturePaymentsAction = settings.custrecord_bsp_lb_capt_pymnt_soap_action;
        let requestBodyXML = capturePaymentsXMLStrRequest(loginData, paymentData);

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapCapturePaymentsAction);

        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            capturePayment = logicBlockServerResponse.CapturePaymentResponse.CapturePaymentResult;
        }
        return capturePayment;
    }

    /**
     * Send PO Payment to Logicblock
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function addPOPayment(settings, loginData, paymentData){
        let poPayment = null;

        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapAddPOPaymentAction = settings.custrecord_bsp_lb_po_payment_soap_action;
        let requestBodyXML = addPOPaymentXMLStrRequest(loginData, paymentData);

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapAddPOPaymentAction);

        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            poPayment = logicBlockServerResponse.AddPurchaseOrderPaymentResponse.AddPurchaseOrderPaymentResult;
        }
        return poPayment;
    }

    /**
     * Cancel Order in Logicblock
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
    */
    function cancelOrder(integrationSettingsRecID, salesOrderId, logicblockId){
        let cancelOrderResult = null;
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);
        let loginData = BSPLBLoginAPI.login(settings);
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_cancel_order_soap_act;
        let cancelOrderStatusID = settings.custrecord_bsp_isg_lb_cancel_orderstatus;

        requestParams = {
            salesOrderId: salesOrderId,
            logicblockId: logicblockId,
            cancelOrderStatusID: cancelOrderStatusID
        }
        let requestBodyXML = cancelOrdersXMLStrRequest(loginData, requestParams);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        log.debug("cancelOrder", JSON.stringify(logicBlockServerResponse));
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            cancelOrderResult = logicBlockServerResponse.PatchOrderResponse.PatchOrderResult;
        }
        return cancelOrderResult;
    }

    /**
     * Add new line Items in LB Order
     * @param {*} integrationSettingsRecID 
     * @param {*} newLinesToAdd 
     * @returns 
     */
    function addLineItemsToOrder(integrationSettingsRecID, newLinesToAdd){
        let result = [];
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);
        let loginData = BSPLBLoginAPI.login(settings);
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_add_line_item;

        for (let index = 0; index < newLinesToAdd.length; index++) {
            const newItem = newLinesToAdd[index];
            requestParams = {
                logicblockId: newItem.logicblockId,
                sku: newItem.productSKU,
                quantity: newItem.productQty
            }
            let requestBodyXML = addLineItemXMLStrRequest(loginData, requestParams);
            let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);

            if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
                result.push({
                    sku: newItem.productSKU,
                    lbItemID: logicBlockServerResponse.AddLineItemBySkuResponse.AddLineItemBySkuResult
                });
            }
        }
        return result;
    }

    /**
     * Update line Items in Logicblock Order
     * @param {*} integrationSettingsRecID 
     * @param {*} logicblockId 
     * @param {*} updatedDeletedLines 
     * @returns 
     */
    function updateLineItemsInOrder(integrationSettingsRecID, logicblockId, updatedDeletedLines){
        let result = null;
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);
        let loginData = BSPLBLoginAPI.login(settings);
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_update_line_items;
        requestParams = {
            logicblockId: logicblockId,
            updatedDeletedLines: updatedDeletedLines
        }
        let requestBodyXML = updateLineItemsXMLStrRequest(loginData, requestParams);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            result = logicBlockServerResponse.UpdateLineItemsResponse.UpdateLineItemsResult;
        }
        return result;
    }

    /**
     * Get order line items by Order ID from Logicblock
     * @param {*} integrationSettingsRecID 
     * @param {*} logicblockId 
     * @returns 
     */
    function getOrderLineItems(integrationSettingsRecID, logicblockId){
        let lbOrderLineItemsResult = [];
        let settings = BSPLBUtils.getIntegrationSettings(integrationSettingsRecID);
        let loginData = BSPLBLoginAPI.login(settings);
        let serviceURL = settings.custrecord_bsp_lb_orders_service_url;
        let soapGetOrdersAction = settings.custrecord_bsp_lb_get_order_by_id;
        requestParams = {
            logicblockId: logicblockId
        }
        let requestBodyXML = getOrderByIdXMLStrRequest(loginData, requestParams);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetOrdersAction);
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            let lbLineItems = logicBlockServerResponse.GetOrderByIdResponse.GetOrderByIdResult.LineItems.LineItem;
            if (lbLineItems.length && lbLineItems.length > 0) {
                lbOrderLineItemsResult = lbLineItems;
            } else {
                lbOrderLineItemsResult.push(lbLineItems);
            }
        }
        return lbOrderLineItemsResult;
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
        let numberOfDays = 1;

        return {
            startDate: startDate,
            endDate: endDate,
            startIndex: startIndex,
            pageSize: pageSize,
            canceledOrders: canceledOrders,
            numberOfDays: numberOfDays
        };
    }

    /**
     * Body of Get Order by ID Request
     * @param {*} loginData 
     * @param {*} logicBlockOrderID 
     * @returns 
     */
    function getOrderByIdXMLStrRequest(loginData, requestParams){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
                <soapenv:Header/>
                <soapenv:Body>
                <tem:GetOrderById>
                    <tem:token>
                        <log:ApiId>${loginData.ApiId}</log:ApiId>
                        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                        <log:Id>${loginData.Id}</log:Id>
                        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                    </tem:token>
                    <tem:orderId>${requestParams.logicblockId}</tem:orderId>
                </tem:GetOrderById>
                </soapenv:Body>
            </soapenv:Envelope>`;
    }

    /**
     * Body of Get Order Payments Request
     * @param {*} loginData 
     * @param {*} logicBlockOrderID 
     * @returns 
     */
    function getOrderPaymentsXMLStrRequest(loginData, logicBlockOrderID){
       return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
        <soapenv:Header/>
        <soapenv:Body>
            <tem:GetOrderPayments>
                <tem:token>
                    <log:ApiId>${loginData.ApiId}</log:ApiId>
                    <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                    <log:Id>${loginData.Id}</log:Id>
                    <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                    <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                </tem:token>
                <tem:orderId>${logicBlockOrderID}</tem:orderId>
            </tem:GetOrderPayments>
        </soapenv:Body>
        </soapenv:Envelope>`;
    }

    /**
     * Body of Order Request
     * @param {*} loginData 
     * @param {*} requestParams 
     * @returns 
     */
     function getOrdersXMLStrRequest(loginData, requestParams, reqIndex, pageSize){
        return  `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
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
                 <log:DownloadStartDate>${requestParams.startDate}</log:DownloadStartDate>    
                 <log:NumberOfDays>${requestParams.numberOfDays}</log:NumberOfDays>
              </tem:ordersReadyForThirdPartyParams>  
              <tem:startIndex>${reqIndex}</tem:startIndex> 
              <tem:pageSize>${pageSize}</tem:pageSize>
           </tem:GetOrdersReadyForThirdParty>
        </soapenv:Body>
     </soapenv:Envelope>`;
    }

   

    /**
     * Body of Create Package Request
     * @param {*} loginData 
     * @param {*} shipPackageData 
     * @returns 
     */
    function createPackageXMLStrRequest(loginData, shipPackageData){

        let packageItem = ``;
        shipPackageData.packageItems.forEach(item => {
            packageItem += `<log:PackageItem>
            <log:LineItemId>${item.lineItemId}</log:LineItemId>
            <log:ProductId>${item.productId}</log:ProductId>
            <log:Quantity>${item.quantity}</log:Quantity>
            </log:PackageItem>`
        });
    
        let xmlBodyRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
        <soapenv:Header/>
        <soapenv:Body>
        <tem:CreatePackage>
        <tem:token>
        <log:ApiId>${loginData.ApiId}</log:ApiId>
        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
        <log:Id>${loginData.Id}</log:Id>
        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
        </tem:token>
        <tem:orderId>${shipPackageData.logicBlockOrderID}</tem:orderId>
        <tem:items>
        ${packageItem}
        </tem:items>
        <tem:shippingProviderId>${shipPackageData.shippingProviderId}</tem:shippingProviderId>
        <tem:shippingMethodId>${shipPackageData.shippingMethodId}</tem:shippingMethodId>         
        <tem:shipDate>${shipPackageData.dateCreated}</tem:shipDate>
        </tem:CreatePackage>
        </soapenv:Body>
        </soapenv:Envelope>`;

        return xmlBodyRequest;
    }

    /**
     * Body of Ship Package Request
     * @param {*} loginData 
     * @param {*} packageId 
     * @returns 
     */
    function shipPackageXMLStrRequest(loginData, packageId){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
        <soapenv:Header/>
            <soapenv:Body>
            <tem:ShipPackage>
                <tem:token>
                    <log:ApiId>${loginData.ApiId}</log:ApiId>
                    <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                    <log:Id>${loginData.Id}</log:Id>
                    <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                    <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                </tem:token>
                <tem:packageId>${packageId}</tem:packageId>
            </tem:ShipPackage>
            </soapenv:Body>
        </soapenv:Envelope>`;
    }

    /**
     * Body of Capture Payment Request
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function capturePaymentsXMLStrRequest(loginData, paymentData){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
            <soapenv:Header/>
            <soapenv:Body>
            <tem:CapturePayment>
                <tem:token>
                    <log:ApiId>${loginData.ApiId}</log:ApiId>
                    <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                    <log:Id>${loginData.Id}</log:Id>
                    <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                    <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                </tem:token>
                <tem:paymentId>${paymentData.paymentId}</tem:paymentId>
                <tem:amount>${paymentData.paymentAmount}</tem:amount>
            </tem:CapturePayment>
            </soapenv:Body>
        </soapenv:Envelope>`;
    }

    /**
     *  Body of Add PO Payment Request
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function addPOPaymentXMLStrRequest(loginData, paymentData){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
            <soapenv:Header/>
            <soapenv:Body>
            <tem:AddPurchaseOrderPayment>
                <tem:token>
                    <log:ApiId>${loginData.ApiId}</log:ApiId>
                    <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                    <log:Id>${loginData.Id}</log:Id>
                    <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                    <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                </tem:token>
                <tem:orderId>${paymentData.orderId}</tem:orderId>
                <tem:amountCharged>${paymentData.amountCharged}</tem:amountCharged>
                <tem:auditDate>${paymentData.auditDate}</tem:auditDate>
                <tem:purchaseOrderNumber>${paymentData.purchaseOrderNumber}</tem:purchaseOrderNumber>
            </tem:AddPurchaseOrderPayment>
            </soapenv:Body>
        </soapenv:Envelope>`;
    }

    /**
     *  Body of cancel Order SOAP Action Request
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function cancelOrdersXMLStrRequest(loginData, requestParams){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <soapenv:Header/>
                <soapenv:Body>
                <tem:PatchOrder>
                    <tem:token>
                        <log:ApiId>${loginData.ApiId}</log:ApiId>
                        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                        <log:Id>${loginData.Id}</log:Id>
                        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                    </tem:token>
                    <tem:order>
                        <log:BackendOrderId>${requestParams.salesOrderId}</log:BackendOrderId>
                        <log:Id>${requestParams.logicblockId}</log:Id>
                        <log:OrderStatusId>${requestParams.cancelOrderStatusID}</log:OrderStatusId>
                    </tem:order>
                </tem:PatchOrder>
                </soapenv:Body>
            </soapenv:Envelope>`;
    }

    /**
     *  Body of add lineItem into Order SOAP Action Request
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */
    function addLineItemXMLStrRequest(loginData, requestParams){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
                <soapenv:Header/>
                <soapenv:Body>
                <tem:AddLineItemBySku>
                    <tem:token>
                        <log:ApiId>${loginData.ApiId}</log:ApiId>
                        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                        <log:Id>${loginData.Id}</log:Id>
                        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                    </tem:token>
                    <tem:orderId>${requestParams.logicblockId}</tem:orderId>
                    <tem:sku>${requestParams.sku}</tem:sku>
                    <tem:quantity>${requestParams.quantity}</tem:quantity>
                </tem:AddLineItemBySku>
                </soapenv:Body>
            </soapenv:Envelope>`;
    }

    /**
     *  Body of update lineItems in Order SOAP Action Request
     * @param {*} loginData 
     * @param {*} paymentData 
     * @returns 
     */  
    function updateLineItemsXMLStrRequest(loginData, requestParams){
        let lineItems = ``;
        requestParams.updatedDeletedLines.forEach(item => {
            lineItems += `<log:LineItem>
            <log:Id>${item.lbItemID}</log:Id>
            <log:Quantity>${item.productQty}</log:Quantity>
            </log:LineItem>`
        });
    
        let xmlBodyRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
        <soapenv:Header/>
        <soapenv:Body>
        <tem:UpdateLineItems>
        <tem:token>
        <log:ApiId>${loginData.ApiId}</log:ApiId>
        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
        <log:Id>${loginData.Id}</log:Id>
        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
        </tem:token>
        <tem:orderId>${requestParams.logicblockId}</tem:orderId>
        <tem:lineItems>
        ${lineItems}
        </tem:lineItems>
        </tem:UpdateLineItems>
        </soapenv:Body>
        </soapenv:Envelope>`;

        return xmlBodyRequest;
    }

    return {
        getOrders: getOrders,
        createPackage: createPackage,
        shipPackage: shipPackage,
        getOrderPayments: getOrderPayments,
        capturePayment: capturePayment,
        addPOPayment: addPOPayment,
        cancelOrder: cancelOrder,
        getOrderLineItems: getOrderLineItems,
        addLineItemsToOrder: addLineItemsToOrder,
        updateLineItemsInOrder: updateLineItemsInOrder
    };
});