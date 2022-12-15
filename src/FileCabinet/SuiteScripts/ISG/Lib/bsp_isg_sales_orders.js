/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record'], function (record) {

    /**
     * It takes an array of linesPartiallyAcknowledged, and maps it to an array to be used to update SO Lines
     * @param soID - The ID of the Sales Order
     * @param linesPartiallyAcknowledged - 
    */
    function updateSOLinesPartiallyAcknowledged(salesOrderRec, linesPartiallyAcknowledged){ 
        let linesPartiallyProcessed = linesPartiallyAcknowledged.map((i) => {
            return {
                itemID: i.itemID,
                quantityProcessed: i.quantityAcknowledged,
                quantityRemaining: i.quantityRemaining
            }
        });
        salesOrderRec = updateSOLines(salesOrderRec, linesPartiallyProcessed);
        return salesOrderRec;
    }

    /**
     * It takes an array of linesPartiallyShipped, and maps it to an array to be used to update SO Lines
     * @param soID - The ID of the Sales Order
     * @param linesPartiallyAcknowledged - 
    */
    function updateSOLinesPartiallyShipped(salesOrderRec, linesPartiallyShipped){ 
        let linesPartiallyProcessed = linesPartiallyShipped.map((i) => {
            return {
                itemID: i.itemID,
                quantityProcessed: i.quantityShipped,
                quantityRemaining: i.quantityRemaining
            }
        });
        salesOrderRec = updateSOLines(salesOrderRec, linesPartiallyProcessed);
        return salesOrderRec;
    }

    /**
     * It takes a sales order ID and an array of objects that contain the item ID, quantity processed,
     * and quantity remaining. It then loads the sales order record, loops through the array of objects,
     * and updates the quantity of the item line to the quantity processed. It then creates a new line
     * with the same item ID and sets the quantity to the quantity remaining. It then copies the data from
     * the original line to the new line
     * @param soID - The internal ID of the sales order
     * @param linesPartiallyProcessed - An array of objects that contain the lines partially processed:
    */
    function updateSOLines(salesOrderRec, linesPartiallyProcessed){      
        if(salesOrderRec){
            log.debug("updateSOLines", `Update lines in SO ID ${salesOrderRec.id}`);
            if(linesPartiallyProcessed.length > 0){
                log.debug("updateSOLines", `Item lines ${JSON.stringify(linesPartiallyProcessed)}`);
     
                for(let i = 0; i < linesPartiallyProcessed.length; i++){
                    let item = linesPartiallyProcessed[i];
                    let itemID = item.itemID;
                    let quantityProcessed = item.quantityProcessed;
                    let quantityRemaining = item.quantityRemaining;
        
                    let lineNum = salesOrderRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemID
                    });
        
                    salesOrderRec.selectLine({
                        sublistId: 'item',
                        line: lineNum
                    });
        
                    let copyData = getItemLineData(salesOrderRec);
                    
                    salesOrderRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: quantityProcessed
                    });
                    salesOrderRec.commitLine({
                        sublistId: "item",
                    });
        
                    salesOrderRec.selectNewLine({ sublistId: "item" });  
                    salesOrderRec.setCurrentSublistValue({sublistId: "item", fieldId: "item", value: itemID });
                    salesOrderRec.setCurrentSublistValue({sublistId: "item", fieldId: "quantity", value: quantityRemaining });
                    for (let index = 0; index < copyData.length; index++) {
                        let element = copyData[index];
                        salesOrderRec.setCurrentSublistValue({sublistId: "item", fieldId: element.fieldID, value: element.fieldValue });
                    }
                    
                    salesOrderRec.commitLine({
                        sublistId: "item",
                    });
                }
                log.debug("updateSOLines", `Sales Order updated`);
            }     
        }
        return salesOrderRec;
    }

    /**
     * It takes a Sales Order record object and returns an array of objects that contain the field ID and field value
     * of the current item line of the record object.
     * @param soRec - The Sales Order record object
     * @returns An array of objects.
    */
    function getItemLineData(soRec){
        let lineData = [];

        let rate = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate'
        });
        lineData.push({fieldID: "rate", fieldValue: rate});

        let porate = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'porate'
        });
        lineData.push({fieldID: "porate", fieldValue: porate});

        let description = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'description'
        });
        lineData.push({fieldID: "description", fieldValue: description});

        let logicblockID = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_bsp_isg_lb_line_item_id'
        });
        lineData.push({fieldID: "custcol_bsp_isg_lb_line_item_id", fieldValue: logicblockID});

        let transmissionTypeID = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_bsp_isg_exclude_auto_transm'
        });
        lineData.push({fieldID: "custcol_bsp_isg_exclude_auto_transm", fieldValue: transmissionTypeID});

        let shipmentTypeID = soRec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_bsp_order_shipment_type'
        });
        lineData.push({fieldID: "custcol_bsp_order_shipment_type", fieldValue: shipmentTypeID});

        return lineData;
    }


    function updateSOItemPORates(salesOrderRec, poRates){
        if(salesOrderRec){
            log.debug("updateSOItemPORates", `Update rates in SO ID ${salesOrderRec.id}`);
            if(poRates.length > 0){
                log.debug("updateSOItemPORates", `Item rates ${JSON.stringify(poRates)}`);
       
                for(let i = 0; i < poRates.length; i++){
                    let item = poRates[i];
                    let itemID = item.itemID;
                    let rate = item.rate;

                    let lineNum = salesOrderRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemID
                    });
        
                    salesOrderRec.selectLine({
                        sublistId: 'item',
                        line: lineNum
                    });
                         
                    salesOrderRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'porate',
                        value: rate
                    });
                    salesOrderRec.commitLine({
                        sublistId: "item",
                    });
                }
                log.debug("updateSOLines", `Sales Order updated`);
            }     
        }
        return salesOrderRec;
    }

    
    function updateSOItemsFailed(salesOrderRec, soLinesFailed){
        if(salesOrderRec){
            log.debug("updateSOItemsFailed", `Update items in SO ID ${salesOrderRec.id}`);
            if(soLinesFailed.length > 0){
                log.debug("updateSOItemsFailed", `Failed Items ${JSON.stringify(soLinesFailed)}`);
       
                for(let i = 0; i < soLinesFailed.length; i++){
                    let item = soLinesFailed[i];
                    let itemID = item.itemID;
                    let reasonFailed = item.reasonFailed;

                    let lineNum = salesOrderRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: itemID
                    });
        
                    salesOrderRec.selectLine({
                        sublistId: 'item',
                        line: lineNum
                    });
                         
                    salesOrderRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_transmission_result',
                        value: reasonFailed
                    });
                    salesOrderRec.commitLine({
                        sublistId: "item",
                    });
                }
                log.debug("updateSOLines", `Sales Order updated`);
            }     
        }
        return salesOrderRec;
    }

    return {
        updateSOLinesPartiallyAcknowledged: updateSOLinesPartiallyAcknowledged,
        updateSOLinesPartiallyShipped: updateSOLinesPartiallyShipped,
        updateSOItemPORates: updateSOItemPORates,
        updateSOItemsFailed: updateSOItemsFailed
	};
});