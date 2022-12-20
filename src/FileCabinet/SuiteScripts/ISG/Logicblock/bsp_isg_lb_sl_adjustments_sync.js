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
                    let lbOrderLineItems = LBOrdersAPI.getOrderLineItems(integrationSettingsRecID, logicblockId);
                    log.debug(stLogTitle, "lbOrderLineItems: " + JSON.stringify(lbOrderLineItems));
                    let soRec = record.load({
                        type: record.Type.SALES_ORDER,
                        id: salesOrderId,
                        isDynamic: true,
                    });
                    let newLinesToAdd = getNewLines(lbOrderLineItems, soRec, logicblockId);
                    log.debug(stLogTitle, "newLinesToAdd: " + JSON.stringify(newLinesToAdd));

                    let updatedDeletedLines = getUpdatedDeletedLines(lbOrderLineItems, soRec);
                    log.debug(stLogTitle, "updatedDeletedLines: " + JSON.stringify(updatedDeletedLines));

                    if(newLinesToAdd.length > 0){
                       let lbLineIDsResult = LBOrdersAPI.addLineItemsToOrder(integrationSettingsRecID, newLinesToAdd);
                       log.debug(stLogTitle, "lbLineIDsResult: " + JSON.stringify(lbLineIDsResult));
                       soRec = updateSalesOrderNewLines(lbLineIDsResult, soRec);
                    }

                    soRec.save();
                    log.debug(stLogTitle, "soRec saved");

                    let message = [{
                        message: "Order has been Syncronized.",
                        failed: false,
                    }];
                    if(updatedDeletedLines.length > 0){
                        let lbResult = LBOrdersAPI.updateLineItemsInOrder(integrationSettingsRecID, logicblockId, updatedDeletedLines);
                        log.debug(stLogTitle, "lbResult: " + JSON.stringify(lbResult));
                        if(lbResult && lbResult == "false"){
                            message = [];
                            message.push({
                                message: "Failed to Syncronize Order with Logicblock. Some changes may not have been uploaded",
                                failed: true,
                            });
                        }
                    }
                    response.write(JSON.stringify(message));
                }
            
            } catch (error) {
                log.error(stLogTitle, error)
                response.write(JSON.stringify([{message: `Failed to Sync order: ${error.message}`, failed: true}]));
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


        /**
         * Returns new lines added in NS Order
        * @param lbOrderLineItems - An array of objects that contain the productSKU and productQty of the
        * items in the Logicblock order.
        * @param soRec - The sales order record that is being created.
        * @param logicblockId - The id of the logicblock record that the sales order is associated with.
        * @returns An array of objects.
        */
        const getNewLines = (lbOrderLineItems, soRec, logicblockId) => {
            let newLines = [];
            for (let i = 0; i < soRec.getLineCount("item"); i++) {
                soRec.selectLine({
                    sublistId: 'item',
                    line: i
                });

                let productSKU = soRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item_display'
                });

                let itemIndex = itemIndexInLogicblockOrder(lbOrderLineItems, productSKU);
                if(itemIndex < 0){
                    let productQty = soRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                    });
                    newLines.push({
                        logicblockId: logicblockId,
                        productSKU: productSKU,
                        productQty: productQty
                    });
                }
            }
            return newLines;
        }

        /**
         * Returns lines updated or removed in NS Order
         * @param {*} lbOrderLineItems 
         * @param {*} soRec 
         * @returns 
         */
        const getUpdatedDeletedLines = (lbOrderLineItems, soRec) => {
            let updatedLines = [];

            /** Updated lines in NS */

            for (let i = 0; i < soRec.getLineCount("item"); i++) {
                soRec.selectLine({
                    sublistId: 'item',
                    line: i
                });
                let productSKU = soRec.getCurrentSublistText({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                let itemIndex = itemIndexInLogicblockOrder(lbOrderLineItems, productSKU);
                if(itemIndex >= 0){
                    let lbItem = lbOrderLineItems[itemIndex];
                    let productQty = soRec.getCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                    });
                    if(lbItem.Quantity != productQty){
                        let lbItemID = soRec.getCurrentSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_bsp_isg_lb_line_item_id",
                        });
                        updatedLines.push({
                            lbItemID: lbItemID,
                            productQty: productQty
                        });
                    }
                }
            }

            /** Deleted lines in NS */

            for (let i = 0; i < lbOrderLineItems.length; i++) {

                let lbItem = lbOrderLineItems[i];
                let lbProductSku = lbItem.ProductSku;
                let itemLineInNetSuite = soRec.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item_display',
                    value: lbProductSku
                });
                if(itemLineInNetSuite < 0){
                    updatedLines.push({
                        lbItemID: lbItem.Id,
                        productQty: 0
                    });
                }         
            }
            return updatedLines;
        }

        /**
         * Updates SO lines with new lbItemLine ID
         * @param {*} newLineIDs 
         * @param {*} soRec 
         * @returns 
         */
        const updateSalesOrderNewLines = (newLineIDs, soRec) => {
            for (let index = 0; index < newLineIDs.length; index++) {
                const newLineObj = newLineIDs[index];
                let itemLineInNetSuite = soRec.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item_display',
                    value: newLineObj.sku
                });
                if(itemLineInNetSuite >= 0){
                    soRec.selectLine({
                        sublistId: 'item',
                        line: itemLineInNetSuite
                    });
                    soRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_lb_line_item_id',
                        value: newLineObj.lbItemID
                    });
                    soRec.commitLine({
                        sublistId: "item",
                    });
                }  
            }
            return soRec;
        }

        const itemIndexInLogicblockOrder = (lbOrderLineItems, productSKU) => {
            for (let index = 0; index < lbOrderLineItems.length; index++) {
                const lbItem = lbOrderLineItems[index];
                if(lbItem.ProductSku == productSKU)
                    return index;
            }
            return -1;
        }

        return {onRequest}

    });
