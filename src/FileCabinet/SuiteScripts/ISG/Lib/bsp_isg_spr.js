/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record','./bsp_isg_purchase_orders.js', './bsp_isg_sales_orders.js'], function (record, BSP_POutil, BSP_SOUtil) {

    /**
     *  'A' = accepted
        'B' = backorder at SPR DC or out of stock
        'P' = UOM order partial shipment
        'Q' = UOM order quantity error
        'D' = discontinued by S. P. Richards
        'X' = discontinued by manufacturer
        'U' = unit of measure error
        'I' = invalid entry
        'S' = non UPSable items cancelled
        'E' = Error. Order can not be processed.
        ‘V’ = Vendor Procured Product
    */
    const STATUS_CODES = Object.freeze({
        accepted : "A",
        backOrder_outOfStock: "B",
        processedPartially: "P",
        error : "E",
        processStatusOK: 1,
        processStatusError: 0,
    });


    /**
     * The function takes a JSON object as an argument, and if the object contains a key called "poNumber",
     * it will use that value to find a PO in NetSuite, and if it finds one, it will update the PO's with
     * the data returned in the Acknowledgment.
     * @param jsonObjResponse - The JSON object that is returned from the RESTlet.
    */
    function processPOAck(jsonObjResponse){
        let stLogTitle = "Trading Partner: SPR";
        log.debug(stLogTitle, `Processing PO Acknowledmgnet`);

        let result = {};

        let poNumber = getAcknowledgmentPOHeaderData(jsonObjResponse,"poNumber");
        let poID = BSP_POutil.findPObyNumber(poNumber);
        if(poID){
            let queueID = BSP_POutil.getQueueOfPO(poID);
            result.queueID = queueID;
            result.poID = poID;
            
            let poAcknowledgmentStatus = getAcknowledgmentPOHeaderData(jsonObjResponse,"Status");

            log.debug(stLogTitle, `PO ID ${poID} :: Status: ${JSON.stringify(poAcknowledgmentStatus)}`);

            if(poAcknowledgmentStatus == STATUS_CODES.accepted){
                let processStatus = processPO(poID, jsonObjResponse);
                if(processStatus == STATUS_CODES.processStatusOK){
                    BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().acknowledged);
                    result.status = "Ok";
                }else{
                    result.status = "Error";
                }
            }else if(poAcknowledgmentStatus == STATUS_CODES.error){
                BSP_POutil.deletePO(poID);
                result.status = "Error";
            }
        }
        return result;
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
        for(let i = (itemCount - 1); i >= 0; i--){
            let item = purchaseOrderRec.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            let acknowledgmentItem = getAcknowledmentItem(ackPOlines, item);
            log.debug("processPOline", `PO Acknowledgment Item Data ${JSON.stringify(acknowledgmentItem)}`);
            let acknowledgmentItemStatus = acknowledgmentItem.Extn.EXTNSprOrderLineList.EXTNSprOrderLine.EXTNSprOrderLine.AckStatus;
            if(acknowledgmentItemStatus == STATUS_CODES.accepted){
                log.debug("processPOline", `Item Processed successfully`);
            }else if(acknowledgmentItemStatus == STATUS_CODES.processedPartially){
                let quantitySent = acknowledgmentItem.OrderLineTranQuantity.OrderLineTranQuantity.OrderedQty;
                let quantityAcknowledged = acknowledgmentItem.Extn.EXTNSprOrderLineList.EXTNSprOrderLine.EXTNSprOrderLine.QtyShipped;
                log.debug(
                    "processPOline", 
                    `Item Processed partially - Quantity sent: ${quantitySent} | Quantity acknowledged: ${quantityAcknowledged}`
                );

                let itemID = purchaseOrderRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                
                if(parseInt(quantityAcknowledged) > 0) {
                    linesPartiallyAcknowledged.push({
                        itemID: itemID,
                        quantitySent: parseInt(quantitySent),
                        quantityAcknowledged: parseInt(quantityAcknowledged),
                        quantityRemaining: (parseInt(quantitySent) - parseInt(quantityAcknowledged))
                    });
    
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: parseInt(quantityAcknowledged)
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
     * It returns the value of the field parameter from the jsonObjResponse parameter.
     * @param jsonObjResponse - The JSON object that is returned from the service.
     * @param field - ID or Status
     * @returns property of JSON object response
     */
    function getAcknowledgmentPOHeaderData(jsonObjResponse, field){
        switch (field) {
            case "poNumber": 
                return  jsonObjResponse.Order.CustomerPONo;
            case "Status":  
                return jsonObjResponse.Extn.EXTNSprOrderHeaderList.EXTNSprOrderHeader.EXTNSprOrderHeader.PoAckStatus;
        }
        return null;
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
     * Return the PO Lines from the PO Acknoweldgment response.
     * @param jsonObjResponse - The JSON object that is returned from the service.
     * @returns Purchase Order Lines.
     */
    function getAcknowledgmentPOLines(jsonObjResponse){
        return jsonObjResponse.OrderLines.OrderLine;
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
                let itemName = element.Item.Item.CustomerItem;
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