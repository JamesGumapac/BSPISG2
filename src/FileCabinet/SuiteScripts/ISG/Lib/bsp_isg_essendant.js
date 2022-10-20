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
                    BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().pendingShipmentNotification);
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
            BSP_SOUtil.updateSOLinesPartiallyAcknowledged(soID, linesPartiallyAcknowledged);
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
     *                     SHIPMENT NOTIFICATION LOGIC
     *
     * ***********************************************************/

    /**
     * It creates a Item Recipt (if PO is W&L) or an Item Fulfillment (if PO is Dropship) from a purchase order, then marks PO lines as closed
     * and splits the SO line if needed.
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns The result object is being returned.
    */
    function processASN(jsonObjResponse){
        let stLogTitle = "Trading Partner: Essendant";
        log.debug(stLogTitle, `Processing ASN`);

        let result = {};

        let poID = getShipmentHeaderFieldValue(jsonObjResponse, "ID");
        log.debug(stLogTitle, `PO: ${poID}`);
        result.poID = poID;
        let soID = BSP_POutil.getSalesOrderID(poID);
        if(autoreceievePO(poID)){
            if(dropShipPO(poID)){
                let itemFulfillmentRec = BSP_POutil.createItemFulfillmentFromPO(soID);
                if(itemFulfillmentRec){
                    result = processItemFulfillment(itemFulfillmentRec, jsonObjResponse, poID, soID, result);
                    if(result.itemFulfillmentRecID){
                        BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().shipmentConfirmed);
                        result.status = "Ok";
                    }else{
                        result.status = "Error";
                    }
                }else{
                    result.status = "Error";
                }
            }else{
                let itemReceiptRec = BSP_POutil.createItemReceiptFromPO(poID);
                if(itemReceiptRec){
                    result = processItemReceipt(itemReceiptRec, jsonObjResponse, poID, soID, result);
                    if(result.itemReceiptRecID){
                        BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().shipmentConfirmed);
                        result.status = "Ok";
                    }else{
                        result.status = "Error";
                    }
                }else{
                    result.status = "Error";
                }
            }
        }   
        return result;
    }

    function autoreceievePO(poID){
        return BSP_POutil.isAutoreceive(poID);
    }
    /**
     * This function returns a boolean value of true or false based on whether the PO is a drop ship PO or
     * not.
     * @param poID - The internal ID of the Purchase Order
     * @returns A boolean value.
    */
    function dropShipPO(poID){
        return BSP_POutil.isDropShip(poID);
    }

    /**
     * The function takes in an item fulfillment record, a JSON object response from the API call, a
     * purchase order ID, a sales order ID, and a result object. It then gets the shipment lines from the
     * JSON object response, gets the item count from the item fulfillment record, creates an array of
     * lines that are partially shipped, creates an array of items that are not shipped, loops through the
     * item fulfillment record, gets the item name, gets the shipment item, sets the quantity shipped,
     * removes the line if the item is not shipped, sets the ship status to "C", saves the item fulfillment
     * record, updates the sales order lines that are partially shipped, and closes the purchase order
     * lines
     * @param itemFulfillmentRec - The item fulfillment record that is being processed.
     * @param jsonObjResponse - The JSON response from the API call
     * @param poID - The internal ID of the Purchase Order
     * @param soID - Sales Order ID
     * @param resultObj - This is the object that will be returned to the client.
     * @returns The resultObj is being returned.
    */
    function processItemFulfillment(itemFulfillmentRec, jsonObjResponse, poID, soID, resultObj){
        let shipmentlines = getShipmentlines(jsonObjResponse);

        let itemCount = itemFulfillmentRec.getLineCount({
            sublistId: 'item'
        });

        let linesPartiallyShipped = [];
        let itemsNotShipped = [];
        for(let i = (itemCount - 1); i >= 0; i--){
            let itemName = itemFulfillmentRec.getSublistText({
                sublistId: 'item',
                fieldId: 'itemname',
                line: i
            });
            let shipmentItem = getShipmentItem(shipmentlines, itemName);
            log.debug("processItemFulfillment", `Item ${JSON.stringify(shipmentItem)}`);
            if(shipmentItem){
                if(parseInt(shipmentItem.OrderQuantity) > parseInt(shipmentItem.ShippedQuantity)){

                    let itemID = itemFulfillmentRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });

                    linesPartiallyShipped.push({
                        itemID: itemID,
                        originalQuantity: parseInt(shipmentItem.OrderQuantity),
                        quantityShipped: parseInt(shipmentItem.ShippedQuantity),
                        quantityRemaining: (parseInt(shipmentItem.OrderQuantity) - parseInt(shipmentItem.ShippedQuantity))
                    });
    
                    itemFulfillmentRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: parseInt(shipmentItem.ShippedQuantity)
                    });
                }
            }else {
                log.debug("processItemFulfillment", `Item not shipped`);
                itemFulfillmentRec.removeLine({
                    sublistId: 'item',
                    line: i,
                });
                itemsNotShipped.push({
                    itemID: itemID
                })
            }
        }

        try{
            itemFulfillmentRec.setValue('shipstatus', "C");
            let recID = itemFulfillmentRec.save();
            resultObj.itemFulfillmentRecID = recID;    
            BSP_SOUtil.updateSOLinesPartiallyShipped(soID, linesPartiallyShipped);  
            //BSP_POutil.closePOlines(poID, linesPartiallyShipped, itemsNotShipped);
        }catch(error){
            resultObj.status = "Error";
            resultObj.itemFulfillmentRecID = null;
            return resultObj;
        }
        
        return resultObj;
    }

    /**
     * The function takes in an item receipt record, a JSON object response from the API call, a PO ID, a
     * SO ID, and a result object. It then gets the shipment lines from the JSON object response, gets the
     * item count from the item receipt record, creates an array of lines that are partially shipped,
     * creates an array of items that are not shipped, loops through the item receipt record, gets the item
     * name, gets the shipment item, checks if the shipment item exists, checks if the order quantity is
     * greater than the shipped quantity, gets the item ID, pushes the item ID, original quantity, quantity
     * shipped, and quantity remaining to the linesPartiallyShipped array, sets the quantity on the item
     * receipt record, removes the line from the item receipt record, pushes the item ID to the
     * itemsNotShipped array, saves the item receipt record, updates the SO lines that are partially
     * shipped, and closes the PO lines.
     * @param itemReceiptRec - The item receipt record that was created from the shipment record.
     * @param jsonObjResponse - The JSON object returned from the API call
     * @param poID - The internal ID of the Purchase Order
     * @param soID - Sales Order ID
     * @param resultObj - This is an object that is passed in to the function. It is used to return the
     * results of the function.
     * @returns The resultObj is being returned.
    */
    function processItemReceipt(itemReceiptRec, jsonObjResponse, poID, soID, resultObj){
        let shipmentlines = getShipmentlines(jsonObjResponse);
        log.debug("processItemReceipt", `Shipment lines: ${JSON.stringify(shipmentlines)}`);
        let itemCount = itemReceiptRec.getLineCount({
            sublistId: 'item'
        });

        let linesPartiallyShipped = [];
        let itemsNotShipped = [];
        for(let i = (itemCount - 1); i >= 0; i--){
            let itemName = itemReceiptRec.getSublistText({
                sublistId: 'item',
                fieldId: 'itemname',
                line: i
            });
            log.debug("processItemReceipt", `ItemName ${JSON.stringify(itemName)}`);
            let shipmentItem = getShipmentItem(shipmentlines, itemName);
            log.debug("processItemReceipt", `ItemFound ${JSON.stringify(shipmentItem)}`);
            if(shipmentItem){
                if(parseInt(shipmentItem.OrderQuantity) > parseInt(shipmentItem.ShippedQuantity)){
                    let itemID = itemReceiptRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    linesPartiallyShipped.push({
                        itemID: itemID,
                        originalQuantity: parseInt(shipmentItem.OrderQuantity),
                        quantityShipped: parseInt(shipmentItem.ShippedQuantity),
                        quantityRemaining: (parseInt(shipmentItem.OrderQuantity) - parseInt(shipmentItem.ShippedQuantity))
                    });
    
                    itemReceiptRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: parseInt(shipmentItem.ShippedQuantity)
                    });
                }
            }else {
                log.debug("processitemReceipt", `Item not shipped`);
                itemReceiptRec.removeLine({
                    sublistId: 'item',
                    line: i,
                });
                itemsNotShipped.push({
                    itemID: itemID
                })
            }
        }
        
        try{
            let recID = itemReceiptRec.save();
            resultObj.itemReceiptRecID = recID;  
            BSP_SOUtil.updateSOLinesPartiallyShipped(soID, linesPartiallyShipped);    
            //BSP_POutil.closePOlines(poID, linesPartiallyShipped, itemsNotShipped);
        }catch(error){
            resultObj.status = "Error";
            resultObj.itemReceiptRecID = null;
            return resultObj;
        }
        return resultObj;
    }

    function getShipmentHeaderFieldValue(jsonObjResponse, field){
        switch (field) {
            case "ID": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentHeader.DocumentReference.PurchaseOrderReference.DocumentID[field];
        }
        return null;
    }

    function getShipmentlines(jsonObjResponse){
        let lines = [];
        let shipmentLines = getASNLines(jsonObjResponse);
        if(shipmentLines.length > 0){
            lines = shipmentLines;
        }else{
            lines.push(shipmentLines);
        }
        return lines;
    }

    function getASNLines(jsonObjResponse){
        return jsonObjResponse.DataArea.Shipment.ShipmentUnit.ShipmentUnitItem;
    }

    function getShipmentItem(shipmentLines, item){
        for (let index = 0; index < shipmentLines.length; index++) {
            let element = shipmentLines[index];
            let itemName = element.ItemID["ID"];
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
        processASN: processASN,
        processInvoice: processInvoice
	};
});