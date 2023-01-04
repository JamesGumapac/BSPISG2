/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', 'N/search', './bsp_isg_purchase_orders.js', './bsp_isg_sales_orders.js'], function (record, search, BSP_POutil, BSP_SOUtil) {

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
                let processStatus = processPO(poID, jsonObjResponse, poAcknowledgmentStatus);
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
    function processPO(poID, jsonObjResponse, poAcknowledgmentStatus){
        let processStatus = STATUS_CODES.processStatusOK;

        let purchaseOrderRec = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID)
        });

        let ackPOlines = getPOlines(jsonObjResponse);
        let soID = purchaseOrderRec.getValue("createdfrom");
        let salesOrderRec = null;
        if(soID){
            salesOrderRec = record.load({
                type: record.Type.SALES_ORDER,
                id: parseInt(soID),
                isDynamic: true
            });
        }

        let vendor = purchaseOrderRec.getValue("entity");
        let account = purchaseOrderRec.getValue("custbody_bsp_isg_transmission_acct_num");

        let vendorSalesOrderID = getAcknowledgmentPOHeaderData(jsonObjResponse,"DocumentID");
        purchaseOrderRec.setValue('custbody_bsp_isg_vendor_so_number', vendorSalesOrderID);
        purchaseOrderRec.setValue('custbody_bsp_isg_po_ack_status', poAcknowledgmentStatus.Reason);

        let itemCount = purchaseOrderRec.getLineCount({
            sublistId: 'item'
        });

        let soLinesFailed = [];
        let poRates = [];
        let linesPartiallyAcknowledged = [];
        for(let i = (itemCount - 1); i >= 0; i--){
            let item = purchaseOrderRec.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            let acknowledgmentItem = getAcknowledmentItem(ackPOlines, item);
            log.debug("processPOline", `PO Acknowledgment Item Data ${JSON.stringify(acknowledgmentItem)}`);

            let rate = parseFloat(acknowledgmentItem.UnitPrice.Amount);
            let facilityName = acknowledgmentItem.Facility.Name;
            let facilityNote = acknowledgmentItem.Facility.Note;
            let ackStatusDescription = acknowledgmentItem.Status.Description;
            let ackStatusReason = acknowledgmentItem.Status.Reason;

            if(acknowledgmentItem.Status.ReasonCode == STATUS_CODES.processedSuccessfully){   
                purchaseOrderRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i,
                    value: rate
                });

                purchaseOrderRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_bsp_isg_ack_status_desc',
                    line: i,
                    value: ackStatusDescription
                });

                purchaseOrderRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_bsp_isg_ack_status_reason',
                    line: i,
                    value: ackStatusReason
                });

                purchaseOrderRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_bsp_isg_facility_name',
                    line: i,
                    value: facilityName
                });

                purchaseOrderRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_bsp_isg_facility_note',
                    line: i,
                    value: facilityNote
                });

                log.debug("processPOline", `Item Processed successfully`);

                let itemID = purchaseOrderRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });

                poRates.push({itemID: itemID, rate: rate});

                updatePricePlan(itemID, vendor, account, rate);
                log.debug("processPOline", `Price plan updated`);

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
                        fieldId: 'rate',
                        line: i,
                        value: rate
                    });
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: parseInt(acknowledgmentItem.Facility.Quantity)
                    });

                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_ack_status_desc',
                        line: i,
                        value: ackStatusDescription
                    });
    
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_ack_status_reason',
                        line: i,
                        value: ackStatusReason
                    });
    
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_facility_name',
                        line: i,
                        value: facilityName
                    });
    
                    purchaseOrderRec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_bsp_isg_facility_note',
                        line: i,
                        value: facilityNote
                    });
                    
                    poRates.push({itemID: itemID, rate: rate});

                    updatePricePlan(itemID, vendor, account, rate);    
                    log.debug("processPOline", `Price plan updated`);             
                }
            }else {
                let itemID = purchaseOrderRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                soLinesFailed.push({itemID: itemID, reasonFailed: `Acknowledgment failed: ${ackStatusReason}`});
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

        if(isMainAccount(account)){
            if(poRates.length > 0){
                updateItemVendorListPrice(poRates, vendor);
            }
        }        

        if(poRates.length > 0){
            salesOrderRec = BSP_SOUtil.updateSOItemPORates(salesOrderRec, poRates);
        }

        if(soLinesFailed.length > 0){
            salesOrderRec = BSP_SOUtil.updateSOItemsFailed(salesOrderRec, soLinesFailed);
        }
        
        if(linesPartiallyAcknowledged.length > 0){
            salesOrderRec = BSP_SOUtil.updateSOLinesPartiallyAcknowledged(salesOrderRec, linesPartiallyAcknowledged);
        }
        salesOrderRec.save();
        log.debug("updateSO", `Sales Order updated`);
        return processStatus;
    }


    function isMainAccount(account){
        const tradingPartnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
               ["name","is","Essendant Inc"]
            ],
            columns:
            [
               search.createColumn({name: "custrecord_bsp_isg_main_account", label: "Main Account"})
            ]
        });
        let mainAccount = null;
        tradingPartnerSearchObj.run().each(function(result){
            mainAccount = result.getValue("custrecord_bsp_isg_main_account");
            return true;
        });

        if(mainAccount && mainAccount == account)
            return true;
        
        return false;
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
            case "DocumentID":
                return jsonObjResponse.DataArea.PurchaseOrder.PurchaseOrderHeader.DocumentReference.SalesOrderReference.DocumentID["ID"];
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

    function updatePricePlan(itemID, vendor, account, rate){
        let pricePlanRecID = getPricePlanID(itemID, vendor, account);
        if(pricePlanRecID){
            record.submitFields({
                type: "customrecord_bsp_isg_item_acct_data",
                id: pricePlanRecID,
                values: {
                    custrecord_bsp_isg_item_cost: rate
                },
                options: {        
                    enableSourcing: false,        
                    ignoreMandatoryFields : true    
                }           
            });
        }
    }

    function getPricePlanID(itemID, supplier, account){
        let planID = null;
        const customrecord_bsp_isg_item_acct_dataSearchObj = search.create({
            type: "customrecord_bsp_isg_item_acct_data",
            filters:
            [
               ["custrecord_bsp_isg_parent_item","anyof",itemID], 
               "AND", 
               ["custrecord_bsp_isg_item_supplier","anyof",supplier], 
               "AND", 
               ["custrecord_bsp_isg_account_number","anyof",account]
            ],
            columns:[]
         });

        customrecord_bsp_isg_item_acct_dataSearchObj.run().each(function(result){
            planID = result.id;
            return true;
        });
        return planID;
    }

    function updateItemVendorListPrice(poRates, vendor){
        for (let index = 0; index < poRates.length; index++) {
            const element = poRates[index];
            let itemID = element.itemID;
            let rate = element.rate;

            let itemRec = record.load({
                type: record.Type.INVENTORY_ITEM,
                id: itemID,
                isDynamic: true,
            });
            let vendorLine = itemRec.findSublistLineWithValue({
                sublistId: 'itemvendor',
                fieldId: 'vendor',
                value: vendor
            });
            if(vendorLine >= 0){
                itemRec.selectLine({
                    sublistId: 'itemvendor',
                    line: vendorLine
                });
                itemRec.setCurrentSublistValue({
                    sublistId: 'itemvendor',
                    fieldId: 'purchaseprice',
                    value: rate,
                    ignoreFieldChange: true
                });
                itemRec.commitLine({
                    sublistId: 'itemvendor'
                });
            }
            itemRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });           
        }
        log.debug("updateItemVendorListPrice","Vendor list prices updated on each Item Record.");
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
                    result = processItemFulfillment(itemFulfillmentRec, jsonObjResponse, poID, soID, result, "C");
                    if(result.itemFulfillmentRecID){
                        BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().shipmentConfirmed);
                        result.status = "Ok";
                    }else{
                        result.status = "Error";
                    }
                }else{
                    result.status = "Error";
                }
            }else if(wrapAndLabelPO(poID)){
                let itemReceiptRec = BSP_POutil.createItemReceiptFromPO(poID);
                if(itemReceiptRec){
                    result = processItemReceipt(itemReceiptRec, jsonObjResponse, poID, soID, result);
                    if(result.itemReceiptRecID){
                        BSP_POutil.updatePOtransmissionStatus(poID, BSP_POutil.transmitionPOStatus().shipmentConfirmed);
                        result.status = "Ok";

                        /**
                         * Create Item Fulfillment for W&L
                         */
                        let itemFulfillmentRec = BSP_POutil.createItemFulfillmentFromPO(soID);
                        if(itemFulfillmentRec){
                            result = processItemFulfillment(itemFulfillmentRec, jsonObjResponse, poID, soID, result, "B");
                            result.status = "Ok";
                        }else{
                            result.status = "Error";
                        }
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
     * This function returns a boolean value of true or false based on whether the PO is a W&L PO or
     * not.
     * @param poID - The internal ID of the Purchase Order
     * @returns A boolean value.
    */
    function wrapAndLabelPO(poID){
        return BSP_POutil.isWrapAndLabel(poID);
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
    function processItemFulfillment(itemFulfillmentRec, jsonObjResponse, poID, soID, resultObj, status){
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
            let itemID = itemFulfillmentRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            let shipmentItem = getShipmentItem(shipmentlines, itemName);
            log.debug("processItemFulfillment", `Item ${JSON.stringify(shipmentItem)}`);
            if(shipmentItem){


                itemFulfillmentRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: parseInt(shipmentItem.ShippedQuantity)
                });

                if(parseInt(shipmentItem.OrderQuantity) > parseInt(shipmentItem.ShippedQuantity)){
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
            let trackingID = getShipmentHeaderFieldValue(jsonObjResponse, "TrackingID");
            let weightMeasure = getShipmentHeaderFieldValue(jsonObjResponse, "GrossWeightMeasure");

            let containerID = getShipmentHeaderFieldValue(jsonObjResponse, "ContainerID");
            let partyID = getShipmentHeaderFieldValue(jsonObjResponse, "PartyIDs");
            let partyName = getShipmentHeaderFieldValue(jsonObjResponse, "Name");
            
            itemFulfillmentRec.setSublistValue({
                sublistId: "package", 
                fieldId: "packageweight", 
                line: 0,
                value: weightMeasure
            });

            itemFulfillmentRec.setSublistValue({
                sublistId: "package", 
                fieldId: "packagetrackingnumber", 
                line: 0,
                value: trackingID
            });

            itemFulfillmentRec.setValue('custbody_bsp_isg_asn_container_id', containerID);
            itemFulfillmentRec.setValue('custbody_bsp_isg_asn_party_id', partyID);
            itemFulfillmentRec.setValue('custbody_bsp_isg_asn_party_name', partyName);

            if(partyID.indexOf("ups") != -1 || partyID.indexOf("UPS") != -1){
                itemFulfillmentRec.setValue({ fieldId: "shipcarrier", value: "ups" });
            }else{
                itemFulfillmentRec.setValue({ fieldId: "shipcarrier", value: "nonups" });
            }
                
            itemFulfillmentRec.setValue('shipstatus', status);
            let recID = itemFulfillmentRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            itemFulfillmentRec = record.load({
                type: record.Type.ITEM_FULFILLMENT,
                id: parseInt(recID),
                isDynamic: true
            });
            itemFulfillmentRec.removeLine({
                sublistId: 'package',
                line: (itemFulfillmentRec.getLineCount({sublistId: 'package'}) -1),
            })
            itemFulfillmentRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            
            resultObj.itemFulfillmentRecID = recID;    

            if(linesPartiallyShipped.length > 0){
                let salesOrderRec = null;
                if(soID){
                    salesOrderRec = record.load({
                        type: record.Type.SALES_ORDER,
                        id: parseInt(soID),
                        isDynamic: true
                    });
                }
                salesOrderRec = BSP_SOUtil.updateSOLinesPartiallyShipped(salesOrderRec, linesPartiallyShipped); 
                salesOrderRec.save();
                log.debug("updateSO", `Sales Order updated`);
            }          
            BSP_POutil.updatePOlines(poID, linesPartiallyShipped, itemsNotShipped);
        }catch(error){
            throw error.message;
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
            let itemID = itemReceiptRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            log.debug("processItemReceipt", `ItemName ${JSON.stringify(itemName)}`);
            let shipmentItem = getShipmentItem(shipmentlines, itemName);
            log.debug("processItemReceipt", `ItemFound ${JSON.stringify(shipmentItem)}`);
            if(shipmentItem){
                if(parseInt(shipmentItem.OrderQuantity) > parseInt(shipmentItem.ShippedQuantity)){
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
            let trackingID = getShipmentHeaderFieldValue(jsonObjResponse, "TrackingID");
            let containerID = getShipmentHeaderFieldValue(jsonObjResponse, "ContainerID");
            let partyID = getShipmentHeaderFieldValue(jsonObjResponse, "PartyIDs");
            let partyName = getShipmentHeaderFieldValue(jsonObjResponse, "Name");
            
            itemReceiptRec.setValue('custbody_bsp_isg_asn_tracking_id', trackingID);
            itemReceiptRec.setValue('custbody_bsp_isg_asn_container_id', containerID);
            itemReceiptRec.setValue('custbody_bsp_isg_asn_party_id', partyID);
            itemReceiptRec.setValue('custbody_bsp_isg_asn_party_name', partyName);

            let recID = itemReceiptRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            resultObj.itemReceiptRecID = recID;  
            if(linesPartiallyShipped.length > 0){
                let salesOrderRec = null;
                if(soID){
                    salesOrderRec = record.load({
                        type: record.Type.SALES_ORDER,
                        id: parseInt(soID),
                        isDynamic: true
                    });
                }
                salesOrderRec = BSP_SOUtil.updateSOLinesPartiallyShipped(salesOrderRec, linesPartiallyShipped); 
                salesOrderRec.save();
                log.debug("updateSO", `Sales Order updated`);
            }
            BSP_POutil.updatePOlines(poID, linesPartiallyShipped, itemsNotShipped);
        }catch(error){
            throw error.message;
        }
        return resultObj;
    }

    /**
     * @param {*} jsonObjResponse 
     * @param {*} field 
     * @returns 
     */
    function getShipmentHeaderFieldValue(jsonObjResponse, field){
        switch (field) {
            case "ID": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentHeader.DocumentReference.PurchaseOrderReference.DocumentID[field];
            case "TrackingID": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentUnit.TrackingID;
            case "ContainerID": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentUnit.ContainerID;
            case "PartyIDs": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentUnit.CarrierParty.PartyIDs["ID"];
            case "Name": 
                return  jsonObjResponse.DataArea.Shipment.ShipmentUnit.CarrierParty.Name;
            case "GrossWeightMeasure":
                return jsonObjResponse.DataArea.Shipment.ShipmentHeader.GrossWeightMeasure;
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