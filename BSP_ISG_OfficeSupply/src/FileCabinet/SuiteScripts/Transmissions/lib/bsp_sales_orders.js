/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './bsp_transmitions_util.js'], function (search, record, BSPTransmitionsUtil) {


    function updateSOLines(soID, linesPartiallyAcknowledged){
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
            fieldId: 'custcol_bsp_lb_line_item_id'
        });
        lineData.push({fieldID: "custcol_bsp_lb_line_item_id", fieldValue: logicblockID});

        return lineData;
    }

    return {
        updateSOLines: updateSOLines
	};
});