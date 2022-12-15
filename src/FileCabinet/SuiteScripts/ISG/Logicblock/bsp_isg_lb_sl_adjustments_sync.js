/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/runtime', '../Lib/bsp_isg_lb_ordersservice_api.js', '../Lib/bsp_isg_lb_settings.js'],
    /**
 * @param{record} record
 * @param{redirect} redirect
 */
    (record, redirect, runtime, LBOrdersAPI, BSPLBSettings) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let stLogTitle = 'onRequest';
            let response = scriptContext.response;
            try {
                log.debug(stLogTitle, '----START----');
                let environment = runtime.envType;
                let integrationSettingsRecID = BSPLBSettings.getSettingsID(environment);

                let requestparam = scriptContext.request.parameters;
                let salesOrderId = requestparam.salesOrderId;
                let logicblockId = requestparam.logicblockId;
                let isCancellation = requestparam.isCancellation;
                log.debug(stLogTitle, {
                    salesOrderId: salesOrderId,
                    logicblockId: logicblockId,
                    isCancellation: isCancellation
                })
                if(isCancellation == "true"){
                    const result = LBOrdersAPI.cancelOrder(integrationSettingsRecID, salesOrderId, logicblockId);
                    log.debug(stLogTitle, "Result: " + JSON.stringify(result));
                    const returnMessage = updateSalesOrder(result, salesOrderId);
                    response.write(JSON.stringify(returnMessage));
                }else{
                    /*const result = LBOrdersAPI.cancelOrder(integrationSettingsRecID, salesOrderId, logicblockId);
                    log.debug(stLogTitle, "Result: " + JSON.stringify(result));
                    const returnMessage = updateSalesOrder(result, salesOrderId);*/
                    response.write(JSON.stringify("test"));
                }

                

            } catch (error) {
                log.error(stLogTitle, error)
                response.write(JSON.stringify([{message: `Failed to cancel/close order: ${e.message}`, failed: true}]));
            };
        }

        /**
         * Update Sales Order 
         * @param {*} response 
         * @param {*} salesOrderId 
         */
        const updateSalesOrder = (response, salesOrderId) => {
            let message = [];
            if(response && response == "true"){
                try{
                    let soRec = record.load({
                        type: record.Type.SALES_ORDER,
                        id: salesOrderId,
                        isDynamic: true,
                    });
                    for (let i = 0; i < soRec.getLineCount("item"); i++) {
                        soRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        soRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'isclosed',
                            value: true
                        });
                        soRec.commitLine({
                            sublistId: "item",
                        });
                    }
                    soRec.setValue({
                        fieldId: "custbody_bsp_isg_lb_order_cancelled",
                        value: true,
                    });
                    soRec.save();

                    message.push({
                        message: "Order has been cancelled.",
                        failed: false,
                    });
                }catch(e){
                    message.push({
                        message: `Failed to cancel/close order: ${e.message}`,
                        failed: true,
                    });
                }
            }else{
                message.push({
                    message: `Failed to cancel/close order in Logicblock`,
                    failed: true,
                });
            }
            return message;
        }

        return {onRequest}

    });
