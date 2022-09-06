/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_purchase_orders.js', './bsp_sales_orders.js'], function (record, BSP_POutil, BSP_SOUtil) {

    const STATUS_CODES = Object.freeze({
        processedSuccessfully : "00",
        processedPartially: "59",
        processedWithErrors : "99",
        processStatusOK: 1,
        processStatusError: 0,
    });


    /**
     * If the PO is processed successfully, then process the PO. If the PO is processed with errors, then
     * delete the PO.
     * @param jsonObjResponse - The JSON object that is returned from the RESTlet.
    */
    function processPOAck(jsonObjResponse){
        let stLogTitle = "Trading Partner: Essendant";
        log.debug(stLogTitle, `Processing PO Acknowledmgnet`);

        let poID = getAcknowledgmentPOHeaderData(jsonObjResponse,"ID");
        if(poID){
            let poAcknowledgmentStatus = getAcknowledgmentPOHeaderData(jsonObjResponse,"Status");

            log.debug(stLogTitle, `PO ID ${poID} :: Status: ${JSON.stringify(poAcknowledgmentStatus)}`);

            if(poAcknowledgmentStatus.ReasonCode == STATUS_CODES.processedSuccessfully){
                let processStatus = processPO(poID, jsonObjResponse);
                if(processStatus == STATUS_CODES.processStatusOK){
                    BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().acknowledged);
                }
            }else if(poAcknowledgmentStatus.ReasonCode == STATUS_CODES.processedWithErrors){
                BSP_POutil.deletePO(poID);
            }
        }
    }

    /**
     * The function takes in a PO ID and a JSON object response from the API call. It then loads the PO
     * record, gets the SO ID from the PO record, gets the PO lines from the JSON object response, loops
     * through the PO lines, and updates the PO lines based on the response from the API call
     * @param poID - The internal ID of the Purchase Order record
     * @param jsonObjResponse - This is the JSON response from the API call.
    */
    function processPO(poID, jsonObjResponse){
        let processStatus = STATUS_CODES.processStatusOK;

        let purchaseOrderRec = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID)
        });

        let ackPOlines = getPOlines(jsonObjResponse);
        let soID = purchaseOrderRec.getValue("createdfrom");
        let itemCount = purchaseOrderRec.getLineCount({
            sublistId: 'item'
        });

        let linesPartiallyAcknowledged = [];
        for(let i = 0; i < itemCount; i++){
            let item = purchaseOrderRec.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            let acknowledgmentItem = getAcknowledmentItem(ackPOlines, item);
            log.debug("processPOline", `PO Acknowledgment Item Data ${JSON.stringify(acknowledgmentItem)}`);

            if(acknowledgmentItem.Status.ReasonCode == STATUS_CODES.processedSuccessfully){
                log.debug("processPOline", `Item Processed successfully`);
            }else if(acknowledgmentItem.Status.ReasonCode == STATUS_CODES.processedPartially){
                log.debug(
                    "processPOline", 
                    `Item Processed partially - Quantity sent: ${acknowledgmentItem.Quantity} | Quantity acknowledged: ${acknowledgmentItem.Facility.Quantity}`
                );

                let itemID = purchaseOrderRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                
                if(parseInt(acknowledgmentItem.Facility.Quantity) > 0){
                    linesPartiallyAcknowledged.push({
                        itemID: itemID,
                        quantitySent: parseInt(acknowledgmentItem.Quantity),
                        quantityAcknowledged: parseInt(acknowledgmentItem.Facility.Quantity),
                        quantityRemaining: (parseInt(acknowledgmentItem.Quantity) - parseInt(acknowledgmentItem.Facility.Quantity))
                    });
    
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: parseInt(acknowledgmentItem.Facility.Quantity)
                    });
                }
            }else {
                log.debug("processPOline", `Item Rejected`);
                purchaseOrderRec.removeLine({
                    sublistId: 'item',
                    line: i,
               });
            }
        }
        
        itemCount = purchaseOrderRec.getLineCount({
            sublistId: 'item'
        });

        if(itemCount > 0){
            purchaseOrderRec.save();
        }else{
            processStatus = STATUS_CODES.processStatusError;
            BSP_POutil.deletePO(poID);
        }

        if(linesPartiallyAcknowledged.length > 0){
            BSP_SOUtil.updateSOLines(soID, linesPartiallyAcknowledged);
        }

        return processStatus;
    }

    /**
     * If the PO Lines has more than one element, return the array, otherwise return the first element of the
     * array.
     * @param jsonObjResponse - This is the JSON object that is returned from the API call.
     * @returns An array of objects.
     */
    function getPOlines(jsonObjResponse){
        let poLines = [];
        let ackPurchaseOrderLines = getAcknowledgmentPOLines(jsonObjResponse);
        if(ackPurchaseOrderLines.length > 0){
            poLines = ackPurchaseOrderLines;
        }else{
            poLines.push(ackPurchaseOrderLines);
        }
        return poLines;
    }

    /**
     * It returns the value of the field parameter from the jsonObjResponse parameter.
     * @param jsonObjResponse - The JSON object that is returned from the service.
     * @param field - ID or Status
     * @returns property of JSON object response
     */
    function getAcknowledgmentPOHeaderData(jsonObjResponse, field){
        switch (field) {
            case "ID": 
                return  jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderHeader.DocumentID[field];
            case "Status":  
                return jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderHeader.Status;
        }
        return null;
    }

    /**
     * Return the PO Lines from the PO Acknoweldgment response.
     * @param jsonObjResponse - The JSON object that is returned from the service.
     * @returns Purchase Order Lines.
     */
    function getAcknowledgmentPOLines(jsonObjResponse){
        return jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderLine;
    }

    /**
     * It takes an array of items returned from the acknowledgment and returns the first object in the array that has a
     * property with a value equal to the item ID passed as a parameter.
     * 
     * If no object is found, it returns null.
     * @param ackPOlines - an array of objects that contain the item information
     * @param item - the item name
     * @returns the element that matches the item name.
     */
    function getAcknowledmentItem(ackPOlines, item){
        for (let index = 0; index < ackPOlines.length; index++) {
            let element = ackPOlines[index];
            let itemName = element.Item.ItemID["ID"];
            if(item == itemName){
                return element;
            }
        }
        return null;
    }


    return {
        processPOAck: processPOAck
	};
});