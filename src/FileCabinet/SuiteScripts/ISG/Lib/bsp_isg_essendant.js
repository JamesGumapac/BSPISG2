/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', './bsp_isg_purchase_orders.js', './bsp_isg_sales_orders.js'], function (record, BSP_POutil, BSP_SOUtil) {

    const STATUS_CODES = Object.freeze({
        processedSuccessfully : "00",
        processedPartially: "59",
        processedWithErrors : "99",
        processStatusOK: 1,
        processStatusError: 0,
    });

    /************************************************************
     * 
     *                   ACKNOWLEDGMENT LOGIC
     *
     * ***********************************************************/

    /**
     * If the PO is processed successfully, then process the PO. If the PO is processed with errors, then
     * delete the PO.
     * @param jsonObjResponse - The JSON object that is returned from the RESTlet.
    */
    function processPOAck(jsonObjResponse){
        let stLogTitle = "Trading Partner: Essendant";
        log.debug(stLogTitle, `Processing PO Acknowledmgnet`);

        let result = {};

        let poID = getAcknowledgmentPOHeaderData(jsonObjResponse,"ID");
        if(poID){
            let queueID = BSP_POutil.getQueueOfPO(poID);
            result.queueID = queueID;
            result.poID = poID;
            let poAcknowledgmentStatus = getAcknowledgmentPOHeaderData(jsonObjResponse,"Status");

            log.debug(stLogTitle, `PO ID ${poID} :: Status: ${JSON.stringify(poAcknowledgmentStatus)}`);

            if(poAcknowledgmentStatus.ReasonCode == STATUS_CODES.processedSuccessfully){
                let processStatus = processPO(poID, jsonObjResponse);
                if(processStatus == STATUS_CODES.processStatusOK){
                    BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().acknowledged);
                    result.status = "Ok";
                }else{
                    result.status = "Error";
                }
            }else if(poAcknowledgmentStatus.ReasonCode == STATUS_CODES.processedWithErrors){
                BSP_POutil.deletePO(poID);
                result.status = "Error";
            }
            log.debug(stLogTitle, `PO ID ${poID} has ben processed`);
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

    function getAcknowledgmentPOHeaderData(jsonObjResponse, field){
        switch (field) {
            case "ID": 
                return  jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderHeader.DocumentID[field];
            case "Status":  
                return jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderHeader.Status;
        }
        return null;
    }

    function getAcknowledgmentPOLines(jsonObjResponse){
        return jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderLine;
    }

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


    /************************************************************
     * 
     *                     INVOICING LOGIC
     *
     * ***********************************************************/

    /**
     * It creates a vendor bill from a purchase order, then processes the vendor bill.
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns The result object is being returned.
    */
    function processInvoice(jsonObjResponse){
        let stLogTitle = "Trading Partner: Essendant";
        log.debug(stLogTitle, `Processing Invoice`);

        let result = {};

        let poID = getInvoiceHeaderFieldValue(jsonObjResponse, "ID");
        log.debug(stLogTitle, `PO: ${poID}`);
        result.poID = poID;
        let vendorBillRec = BSP_POutil.createBillFromPO(poID);
        if(vendorBillRec){
            result = processVendorBill(vendorBillRec, jsonObjResponse, result);
        }else{
            result.status = "Error";
        }
        return result;
    }

    /**
     * The function takes a vendor bill record, a JSON object containing the response from the API call,
     * and a result object. It then gets the invoice lines from the JSON object, gets the item count from
     * the vendor bill record, loops through the items on the vendor bill record, gets the invoice item
     * from the invoice lines, and sets the quantity on the vendor bill record. If the item is not billed,
     * it removes the line from the vendor bill record. If there are items on the vendor bill record, it
     * saves the record and sets the vendor bill record ID on the result object. If there are no items on
     * the vendor bill record, it sets the status to error and returns the result object.
     * @param vendorBillRec - The vendor bill record that was created in the previous step.
     * @param jsonObjResponse - The JSON response from the API call
     * @param resultObj - This is the object that will be returned to the client script.
     * @returns The resultObj is being returned.
    */
    function processVendorBill(vendorBillRec, jsonObjResponse, resultObj){
        let invoicelines = getInvoicelines(jsonObjResponse);

        let itemCount = vendorBillRec.getLineCount({
            sublistId: 'item'
        });

        for(let i = (itemCount - 1); i >= 0; i--){
            let item = vendorBillRec.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            let invoiceItem = getInvoiceItem(invoicelines, item);
            log.debug("processVendorBill", `Item ${JSON.stringify(invoiceItem)}`);
            if(invoiceItem){
                vendorBillRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: parseInt(invoiceItem.Quantity)
                });
            }else {
                log.debug("processVendorBill", `Item not billed`);
                vendorBillRec.removeLine({
                    sublistId: 'item',
                    line: i,
               });
            }
        }
        
        itemCount = vendorBillRec.getLineCount({
            sublistId: 'item'
        });

        if(itemCount > 0){
            let recID = vendorBillRec.save();
            resultObj.vendorBillRecID = recID;
        }else{
            resultObj.status = "Error";
            resultObj.vendorBillRecID = null;
            return resultObj;
        }

        return resultObj;
    }

    function getInvoiceHeaderFieldValue(jsonObjResponse, field){
        switch (field) {
            case "ID": 
                return  jsonObjResponse.DataArea.Invoice.InvoiceHeader.PurchaseOrderReference.DocumentID[field];
        }
        return null;
    }

    function getInvoicelines(jsonObjResponse){
        let lines = [];
        let invoiceLines = getLines(jsonObjResponse);
        if(invoiceLines.length > 0){
            lines = invoiceLines;
        }else{
            lines.push(invoiceLines);
        }
        return lines;
    }

    function getLines(jsonObjResponse){
        return jsonObjResponse.DataArea.Invoice.InvoiceLine;
    }

    function getInvoiceItem(invoiceLines, item){
        for (let index = 0; index < invoiceLines.length; index++) {
            let element = invoiceLines[index];
            let itemName = element.Item.ItemID["ID"];
            if(item == itemName){
                return element;
            }
        }
        return null;
    }

    return {
        processPOAck: processPOAck,
        processInvoice: processInvoice
	};
});