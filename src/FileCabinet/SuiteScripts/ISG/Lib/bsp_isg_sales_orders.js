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
    function updateSOLinesPartiallyAcknowledged(soID, linesPartiallyAcknowledged){ 
        let linesPartiallyProcessed = linesPartiallyAcknowledged.map((i) => {
            return {
                itemID: i.itemID,
                quantityProcessed: i.quantityAcknowledged,
                quantityRemaining: i.quantityRemaining
            }
        });
        updateSOLines(soID, linesPartiallyProcessed)
    }

    /**
     * It takes an array of linesPartiallyShipped, and maps it to an array to be used to update SO Lines
     * @param soID - The ID of the Sales Order
     * @param linesPartiallyAcknowledged - 
    */
    function updateSOLinesPartiallyShipped(soID, linesPartiallyShipped){ 
        let linesPartiallyProcessed = linesPartiallyShipped.map((i) => {
            return {
                itemID: i.itemID,
                quantityProcessed: i.quantityShipped,
                quantityRemaining: i.quantityRemaining
            }
        });
        updateSOLines(soID, linesPartiallyProcessed)
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
    function updateSOLines(soID, linesPartiallyProcessed){      
        if(soID){
            log.debug("updateSOLines", `Update lines in SO ID ${soID}`);
            if(linesPartiallyProcessed.length > 0){
                log.debug("updateSOLines", `Item lines ${JSON.stringify(linesPartiallyProcessed)}`);

                let salesOrderRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: parseInt(soID),
                    isDynamic: true
                });
        
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
                salesOrderRec.save();
                log.debug("updateSOLines", `Sales Order updated`);
            }     
        }
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

        return lineData;
    }

    return {
        updateSOLinesPartiallyAcknowledged: updateSOLinesPartiallyAcknowledged,
        updateSOLinesPartiallyShipped: updateSOLinesPartiallyShipped
	};
});