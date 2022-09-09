/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record'], function (record) {


    /**
     * It takes a sales order ID and an array of objects that contain the item ID, quantity acknowledged,
     * and quantity remaining. It then loads the sales order record, loops through the array of objects,
     * and updates the quantity of the item line to the quantity acknowledged. It then creates a new line
     * with the same item ID and sets the quantity to the quantity remaining. It then copies the data from
     * the original line to the new line
     * @param soID - The internal ID of the sales order
     * @param linesPartiallyAcknowledged - An array of objects that contain the following properties:
    */
    function updateSOLines(soID, linesPartiallyAcknowledged){      
        if(soID){
            log.debug("updateSOLines", `Update lines in SO ID ${soID}`);
            log.debug("updateSOLines", `Item lines ${JSON.stringify(linesPartiallyAcknowledged)}`);

            let salesOrderRec = record.load({
                type: record.Type.SALES_ORDER,
                id: parseInt(soID),
                isDynamic: true
            });
    
            for(let i = 0; i < linesPartiallyAcknowledged.length; i++){
                let item = linesPartiallyAcknowledged[i];
                let itemID = item.itemID;
                let quantityAcknowledged = item.quantityAcknowledged;
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
                    value: quantityAcknowledged
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
        updateSOLines: updateSOLines
	};
});