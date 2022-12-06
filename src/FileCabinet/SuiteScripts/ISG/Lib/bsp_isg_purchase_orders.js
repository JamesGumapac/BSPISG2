/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record'], function (search, record) {

    const PO_TRANSMITION_STATUSES = Object.freeze({
        pendingTransmission: 1,
        pendingAcknowledment: 2,
        pendingShipmentNotification: 3,
        transmissionFailed: 4,
        transmitting: 5,
        acknowledgmentFailed: 6,
        shipmentConfirmed: 7
    });

    const SHIPMENT_TYPES = Object.freeze({
        dropship: 1,
        wrapAndLabel: 2
    });

    /**
     * Returns PO Transmition Status Constants
     * @returns 
    */   
    function transmitionPOStatus(){
        return PO_TRANSMITION_STATUSES;
    }

    /**
     * It updates the PO transmission status field on the PO record.
     * @param poID - The internal ID of the PO
     * @param status - The status of the PO transmission.
    */
    function updatePOtransmissionStatus(poID, status){
        record.submitFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            values: {
                custbody_bsp_isg_po_transm_status: status
            }
        });
    }

    /**
     * It takes a PO ID and a service body response object, and then updates the PO with the MessageID from
     * the service body response.
     * @param poID - The internal ID of the Purchase Order record
     * @param serviceBodyResponse - This is the response from the service body. It's a JSON object.
    */
    function setPOMessageID(poID, serviceBodyResponse){
        record.submitFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            values: {
                custbody_bsp_isg_transmission_msg_id: serviceBodyResponse.Id
            }
        });
    }

    /**
     * It searches for all purchase orders that belongs to a specific transmission Queue and returns an array of
     * objects that contain the purchase order ID, route code, currency, customer information, and an array
     * of items. 
     * @param transmitionQueueID - The ID of the transmission queue record.
     * @returns An array of objects.
    */
    function getPurchaseOrdersForTransmission(transmitionQueueID, poRecID){
        let purchaseOrderList = [];
        let purchaseOrderSearchObj = null;

        if(transmitionQueueID){
            purchaseOrderSearchObj = search.create({
                type: "purchaseorder",
                filters:
                [
                   ["type","anyof","PurchOrd"], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["custbody_bsp_isg_transm_queue_id","is",transmitionQueueID],
                   "AND", 
                   ["custbody_bsp_isg_po_transm_status","anyof",PO_TRANSMITION_STATUSES.pendingTransmission]
                ],
                columns:
                [
                   search.createColumn({name: "tranid", label: "Document Number"}),
                   search.createColumn({name: "custbody_bsp_isg_order_type", label: "Order Type"}),
                   search.createColumn({name: "custbody_bsp_isg_route_code", label: "Route Code"}),
                   search.createColumn({name: "line", label: "Line ID"}),
                   search.createColumn({name: "item", label: "Item"}),
                   search.createColumn({name: "quantity", label: "Quantity"}),
                   search.createColumn({name: "rate", label: "Item Rate"}),
                   search.createColumn({name: "unitabbreviation", label: "Units"}),
                   search.createColumn({name: "trandate", label: "Date"}),
                   search.createColumn({name: "createdfrom", label: "Sales Order"}),
                   search.createColumn({name: "custbody_bsp_isg_transmission_acct_num", label: "Account Number"}),
                   search.createColumn({name: "custbody_bsp_isg_transmission_loc", label: "Transmission Location"}),
                   search.createColumn({name: "custbody_bsp_isg_adot", label: "Adot"}),      
                   search.createColumn({name: "shipaddress1", label: "Shipping Address 1"}),
                   search.createColumn({name: "shipaddressee", label: "Shipping Addressee"}),
                   search.createColumn({name: "shipcity", label: "Shipping City"}),
                   search.createColumn({name: "shipcountrycode", label: "Shipping Country Code"}),
                   search.createColumn({name: "shipzip", label: "Shipping Zip"}),
                   search.createColumn({name: "shipstate", label: "Shipping State/Province"}),  
                   search.createColumn({
                    name: "firstname",
                    join: "customer",
                    label: "First Name"
                   }),
                   search.createColumn({
                    name: "lastname",
                    join: "customer",
                    label: "Last Name"
                   }),
                   search.createColumn({
                      name: "symbol",
                      join: "Currency",
                      label: "Symbol"
                   })
                ]
            });
        }else if(poRecID){
            purchaseOrderSearchObj = search.create({
                type: "purchaseorder",
                filters:
                [
                   ["type","anyof","PurchOrd"], 
                   "AND", 
                   ["mainline","is","F"], 
                   "AND", 
                   ["internalid","anyof",poRecID]
                ],
                columns:
                [
                   search.createColumn({name: "tranid", label: "Document Number"}),
                   search.createColumn({name: "custbody_bsp_isg_order_type", label: "Order Type"}),
                   search.createColumn({name: "custbody_bsp_isg_route_code", label: "Route Code"}),
                   search.createColumn({name: "line", label: "Line ID"}),
                   search.createColumn({name: "item", label: "Item"}),
                   search.createColumn({name: "quantity", label: "Quantity"}),
                   search.createColumn({name: "rate", label: "Item Rate"}),
                   search.createColumn({name: "unitabbreviation", label: "Units"}),
                   search.createColumn({name: "trandate", label: "Date"}),
                   search.createColumn({name: "createdfrom", label: "Sales Order"}),
                   search.createColumn({name: "custbody_bsp_isg_transmission_acct_num", label: "Account Number"}),
                   search.createColumn({name: "custbody_bsp_isg_transmission_loc", label: "Transmission Location"}), 
                   search.createColumn({name: "custbody_bsp_isg_adot", label: "Adot"}),
                   search.createColumn({name: "shipaddress1", label: "Shipping Address 1"}),
                   search.createColumn({name: "shipaddressee", label: "Shipping Addressee"}),
                   search.createColumn({name: "shipcity", label: "Shipping City"}),
                   search.createColumn({name: "shipcountrycode", label: "Shipping Country Code"}),
                   search.createColumn({name: "shipzip", label: "Shipping Zip"}),
                   search.createColumn({name: "shipstate", label: "Shipping State/Province"}),  
                   search.createColumn({
                    name: "firstname",
                    join: "customer",
                    label: "First Name"
                   }),
                   search.createColumn({
                    name: "lastname",
                    join: "customer",
                    label: "Last Name"
                   }),
                   search.createColumn({
                      name: "symbol",
                      join: "Currency",
                      label: "Symbol"
                   })
                ]
            });
        }

        let poResultList = searchAll(purchaseOrderSearchObj);

        poResultList.forEach(element => {
            let purchaseOrderID = element.id;
            let purchaseOrderNumber = element.getValue("tranid");
            let orderType = element.getText("custbody_bsp_isg_order_type");
            let purchaseOrderDate = element.getValue("trandate");
            let salesOrderID = element.getValue("createdfrom");
            let salesOrder = element.getText("createdfrom");
            let routeCodeID = element.getValue("custbody_bsp_isg_route_code");
            let routeCode = element.getText("custbody_bsp_isg_route_code");
            let currency = element.getValue({name: "symbol", join: "Currency"});
            let accountNumberID = element.getValue("custbody_bsp_isg_transmission_acct_num");
            let accountNumberText = element.getText("custbody_bsp_isg_transmission_acct_num");
            let locationID = element.getValue("custbody_bsp_isg_transmission_loc");
            let locationText = element.getText("custbody_bsp_isg_transmission_loc");
            let adot = element.getText("custbody_bsp_isg_adot");
            let shipAddress = {
                companyName: element.getValue({name: "firstname", join: "customer"}) + " " + element.getValue({name: "lastname", join: "customer"}),
                addressee: element.getValue("shipaddressee"),
                address1: element.getValue("shipaddress1"),
                city: element.getValue("shipcity"),
                state: element.getValue("shipstate"),
                zipcode: element.getValue("shipzip"),
                countrycode: element.getValue("shipcountrycode")
            }
            let item = {
                itemLine: element.getValue("line"),
                itemID: element.getValue("item"),
                itemName: element.getText("item"),
                itemQuantity:element.getValue("quantity"),
                itemRate: element.getValue("rate"),
                itemUOM: element.getValue("unitabbreviation")
           }   
           
           let poIndex = getPOindex(purchaseOrderList, purchaseOrderID);
           if(poIndex >= 0){
                purchaseOrderList[poIndex].items.push(item);
           }else{
                purchaseOrderList.push({
                    purchaseOrderID: purchaseOrderID,
                    purchaseOrderNumber: purchaseOrderNumber,
                    orderType: orderType,
                    purchaseOrderDate: getXMLDate(new Date(purchaseOrderDate)),
                    salesOrderID: salesOrderID,
                    salesOrder: salesOrder,
                    routeCodeID: routeCodeID,
                    routeCode: routeCode,
                    currency: currency,
                    shipAddress: shipAddress,
                    account: {id:accountNumberID, text: accountNumberText},
                    transmissionLocation: {id:locationID, text: locationText},
                    adot: adot,
                    items: [item]
                })
           }
        });  

        return purchaseOrderList; 
    }

    /**
     * It returns the index of the purchase order in the purchase order list that has the specified
     * purchase order ID.
     * @param purchaseOrderList - the list of purchase orders
     * @param purchaseOrderID - the ID of the purchase order you want to find
     * @returns The index of the purchaseOrderID in the purchaseOrderList array.
    */
    function getPOindex(purchaseOrderList, purchaseOrderID){
        for (let index = 0; index < purchaseOrderList.length; index++) {
            const element = purchaseOrderList[index];
            if (element.purchaseOrderID == purchaseOrderID){
                return index;
            }
        }
        return -1;
    }

    /**
     * It creates a purchase order record with default values coming from the SO, then removes any items that are not
     * included in the transmission. 
     * @param poData - 
     * @returns The ID of the newly created Purchase Order.
    */
    function createPurchaseOrders(poData){
        let purchaseOrderIDs = [];

        let itemData = getItemPrices(poData.itemData, poData.vendor, poData.account.value);
        let wrapAndLabelItems = getWrapAndLabelItems(itemData);
        let dropShipItems = getDropShipItems(itemData);

        if(wrapAndLabelItems.length > 0){
            let purchaseOrderRec = record.create({
                type: record.Type.PURCHASE_ORDER,
                isDynamic: true,
                defaultValues: {
                    'soid' : poData.salesOrderID,
                    'specord' : 'T',
                    'custid': poData.customer,
                    'entity': poData.vendor
                }
            });

            purchaseOrderRec.setValue({
                fieldId: "customform",
                value: parseInt(poData.transactionForm),
            });
    
            purchaseOrderRec.setValue({
                fieldId: "location",
                value: parseInt(poData.location),
            });

            /**
              * Shipping Address Subrecord
            */

            let shipAddressSubrec = purchaseOrderRec.getSubrecord({
                fieldId: 'shippingaddress'
            });

            shipAddressSubrec.setValue({
                fieldId: 'country',
                value: poData.shipAddress.shipcountry
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'city',
                value: poData.shipAddress.shipcity
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'state',
                value: poData.shipAddress.shipstate
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'zip',
                value: poData.shipAddress.shipzip
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'addr1',
                value: poData.shipAddress.shipaddress1
            });

            purchaseOrderRec.setValue({
                fieldId: "shipaddress",
                value: poData.shipAddress.shipaddress,
            });
          
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_route_code",
                value: parseInt(poData.routeCode),
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_autoreceived",
                value: poData.autoreceive,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_adot",
                value: poData.adot,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transmission_acct_num",
                value: poData.account.value,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transmission_loc",
                value: poData.transmissionLocation,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transm_queue_id",
                value: poData.transmitionQueueID,
            });

            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_order_type",
                value: SHIPMENT_TYPES.wrapAndLabel,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_po_transm_status",
                value: PO_TRANSMITION_STATUSES.pendingTransmission,
            });
    
            let itemCount = purchaseOrderRec.getLineCount({
                sublistId: 'item'
            });
            if(itemCount > 0){
                for(let i = 0 ; i < itemCount ; i++){
                    let item = purchaseOrderRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    let rate = findItemRate(wrapAndLabelItems, item);
                    if(rate && rate != -1){
                        purchaseOrderRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
            
                        purchaseOrderRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: parseFloat(rate)
                        });
                        purchaseOrderRec.commitLine({
                            sublistId: "item",
                        });
                    }
                    if(itemNotIncludedInTransmission(item, wrapAndLabelItems)){
                        log.debug("createPurchaseOrder W&L", `Item ${item} will be removed`);
                        purchaseOrderRec.removeLine({
                            sublistId: 'item',
                            line: i,
                       });
                    }
                }
                poID = purchaseOrderRec.save();
                purchaseOrderIDs.push(poID);
            }else{
                throw `There was an unexpected Error while trynig to create a PO for Sales Order ID ${poData.salesOrderID}`;
            }
        }

        if(dropShipItems.length > 0){
            let purchaseOrderRec = record.create({
                type: record.Type.PURCHASE_ORDER,
                isDynamic: true,
                defaultValues: {
                    'soid' : poData.salesOrderID,
                    'dropship' : 'T',
                    'custid': poData.customer,
                    'entity': poData.vendor
                }
            });

            purchaseOrderRec.setValue({
                fieldId: "customform",
                value: parseInt(poData.transactionForm),
            });

            /**
              * Shipping Address Subrecord
            */
           
             let shipAddressSubrec = purchaseOrderRec.getSubrecord({
                fieldId: 'shippingaddress'
            });

            shipAddressSubrec.setValue({
                fieldId: 'country',
                value: poData.shipAddress.shipcountry
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'city',
                value: poData.shipAddress.shipcity
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'state',
                value: poData.shipAddress.shipstate
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'zip',
                value: poData.shipAddress.shipzip
            });
    
            shipAddressSubrec.setValue({
                fieldId: 'addr1',
                value: poData.shipAddress.shipaddress1
            });

            purchaseOrderRec.setValue({
                fieldId: "shipaddress",
                value: poData.shipAddress.shipaddress,
            });
      
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_autoreceived",
                value: poData.autoreceive,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_adot",
                value: poData.adot,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transmission_acct_num",
                value: poData.account.value,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transmission_loc",
                value: poData.transmissionLocation,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_transm_queue_id",
                value: poData.transmitionQueueID,
            });
    
            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_order_type",
                value: SHIPMENT_TYPES.dropship,
            });

            purchaseOrderRec.setValue({
                fieldId: "custbody_bsp_isg_po_transm_status",
                value: PO_TRANSMITION_STATUSES.pendingTransmission,
            });
    
            let itemCount = purchaseOrderRec.getLineCount({
                sublistId: 'item'
            });
            if(itemCount > 0){
                for(let i = 0 ; i < itemCount ; i++){
                    let item = purchaseOrderRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    let rate = findItemRate(dropShipItems, item);
                    if(rate && rate != -1){
                        purchaseOrderRec.selectLine({
                            sublistId: 'item',
                            line: i
                        });
            
                        purchaseOrderRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: parseFloat(rate)
                        });
                        purchaseOrderRec.commitLine({
                            sublistId: "item",
                        });
                    }
                    if(itemNotIncludedInTransmission(item, dropShipItems)){
                        log.debug("createPurchaseOrder dropShip", `Item ${item} will be removed`);
                        purchaseOrderRec.removeLine({
                            sublistId: 'item',
                            line: i,
                       });
                    }
                }
                poID = purchaseOrderRec.save();
                purchaseOrderIDs.push(poID);
            }else{
                throw `There was an unexpected Error while trynig to create a PO for Sales Order ID ${poData.salesOrderID}`;
            }
        }
        return purchaseOrderIDs;
    }

    function getItemPrices(items, vendor, account){

        let resultItems = items.map(i => JSON.parse(i));

        const customrecord_bsp_isg_item_acct_dataSearchObj = search.create({
            type: "customrecord_bsp_isg_item_acct_data",
            filters:
            [
               ["custrecord_bsp_isg_parent_item","anyof",resultItems.map(i => i.itemID)], 
               "AND", 
               ["custrecord_bsp_isg_account_number","anyof",account], 
               "AND", 
               ["custrecord_bsp_isg_item_supplier","anyof",vendor]
            ],
            columns:
            [
               search.createColumn({name: "custrecord_bsp_isg_parent_item", label: "Item"}),
               search.createColumn({name: "custrecord_bsp_isg_item_cost", label: "Cost"})
            ]
         });

        customrecord_bsp_isg_item_acct_dataSearchObj.run().each(function(result){
            let itemID = result.getValue({name: 'custrecord_bsp_isg_parent_item'});
            let cost = result.getValue({name: 'custrecord_bsp_isg_item_cost'});
            let itemIndex = findItemIndex(resultItems, itemID);
            if(itemIndex >=0){
                resultItems[itemIndex].cost = cost;
            }
            return true;
        })
        return resultItems;
    }

    function findItemIndex(items, itemID){
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if(element.itemID == itemID){
                return index;
            }
        }     
        return -1;
    }

    function findItemRate(items, itemID){
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if(element.itemID == itemID){
                return element.cost;
            }
        }     
        return -1;
    }

    /**
     * It takes an array of items from the Sales Orders, and returns an array of items that are WrapAndLabel.
     * @param items - An array of JSON objects that represent the items in the cart.
     * @returns An array of objects.
     */
    function getWrapAndLabelItems(items) {
        let wrapAndLabelItems = [];
        for (let index = 0; index < items.length; index++) {
            let element = items[index];
            if(element.shipmentType == SHIPMENT_TYPES.wrapAndLabel){
                wrapAndLabelItems.push(element);
            }
        }
        return wrapAndLabelItems;
    }

    /**
     * It takes an array of items from the Sales Orders, and returns an array of items that are dropship.
     * @param items - An array of JSON objects that represent the items in the cart.
     * @returns An array of objects.
     */
    function getDropShipItems(items) {
        let dropshipItems = [];
        for (let index = 0; index < items.length; index++) {
            let element = items[index];
            if(element.shipmentType == SHIPMENT_TYPES.dropship){
                dropshipItems.push(element);
            }
        }
        return dropshipItems;
    }

    /**
     * If the itemID is not in the items array, return true, otherwise return false.
     * @param itemID - The ID of the item you want to check
     * @param items - This is an array of objects that are to be transmitted.
     * @returns a boolean value.
    */
    function itemNotIncludedInTransmission(itemID, items){
        for (let index = 0; index < items.length; index++) {
            const element = items[index];
            if(itemID == element.itemID){
                return false;
            }
        }
        return true;
    }

    /**
     * This function deletes a PO record when the PO is rejected. (Only delete POs from Automatic transmissions)
     * @param poID - The internal ID of the PO record
    */
    function deletePO(poID){
        let queueID = getQueueOfPO(poID);
        if(queueID){
            record.delete({
                type: record.Type.PURCHASE_ORDER,
                id: parseInt(poID),
            });
            log.debug("deletePO", `PO ID ${poID} REJECTED. PO Record has been deleted`);
        }  
    }

    /**
     * It takes a PO number as an argument and returns the internal ID of the PO.
     * @param poNumber - The PO number you want to find the ID for
     * @returns The ID of the PO.
    */
    function findPObyNumber(poNumber){
        let poID = null;
        const purchaseorderSearchObj = search.create({
            type: "purchaseorder",
            filters:
            [
               ["type","anyof","PurchOrd"], 
               "AND", 
               ["number","equalto",poNumber], 
               "AND", 
               ["mainline","is","T"]
            ],
            columns:[]
         });

        purchaseorderSearchObj.run().each(function(result){
            poID = result.id;
            return true;
        });
        return poID; 
    }

    /**
     * It takes a PO ID and returns the ID of the queue that the PO is assigned to.
     * @param poID - The internal ID of the PO
     * @returns The queue ID of the PO.
    */
    function getQueueOfPO(poID){
        let queueID = null;

        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'custbody_bsp_isg_transm_queue_id'
        });
        if(poFields && poFields.custbody_bsp_isg_transm_queue_id){
            queueID = poFields.custbody_bsp_isg_transm_queue_id;
        }

        return queueID;
    }

    /**
     * It takes a PO ID and returns the vendor ID.
     * @param poID - The internal ID of the purchase order.
     * @returns The vendor ID.
     */
    function getVendor(poID){
        let vendor = null;

        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'entity'
        });
        if(poFields && poFields.entity){
            vendor = poFields.entity[0].value;
        }
        return vendor;
    }

    /**
     * It takes a PO ID, looks up the PO record, and returns an object with the PO's Essendant ADOT and
     * Account Number.
     * @param poID - The internal ID of the Purchase Order
     * @returns an object with two properties: essendantADOT and accountNumber.
    */
    function getTransmissionFields(poID){
        let fields = {};

        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: ['custbody_bsp_isg_adot', 'custbody_bsp_isg_transmission_acct_num']
        });
        if(poFields && poFields.custbody_bsp_isg_adot && poFields.custbody_bsp_isg_adot[0]){
            fields.adot = poFields.custbody_bsp_isg_adot[0].text;
        }
        if(poFields && poFields.custbody_bsp_isg_transmission_acct_num){
            fields.accountNumber = poFields.custbody_bsp_isg_transmission_acct_num[0];
        }
        return fields;
    }


    /**
     * This function takes a PO ID and returns a Vendor Bill record.
     * @param poID - The internal ID of the Purchase Order record
     * @returns A Vendor Bill Record
    */
    function createBillFromPO(poID) {
        let functionName = "createBillFromPO";
        let vendorBillRec = null;
        try{        
            vendorBillRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: parseInt(poID),
                toType: record.Type.VENDOR_BILL,
            });
        }catch(error){
            log.error(functionName, "Error creating Vendor Bill Record: " + JSON.stringify(error.message));
            return null;
        }

        return vendorBillRec;
    }

    /**
     * This function takes a PO ID and returns an Item Fulfillmemt record.
     * @param poID - The internal ID of the Purchase Order record
     * @returns A Vendor Bill Record
    */
    function createItemFulfillmentFromPO(soID) {
        let functionName = "createItemFulfillmentFromPO";
        let itemFulfillmentRec = null;
        try{        
            itemFulfillmentRec = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: parseInt(soID),
                toType: record.Type.ITEM_FULFILLMENT,
            });
        }catch(error){
            log.error(functionName, "Error creating Item Fulfillment Record: " + JSON.stringify(error.message));
            return null;
        }

        return itemFulfillmentRec;
    }

    /**
     * This function takes a PO ID and returns an Item Receipt record.
     * @param poID - The internal ID of the Purchase Order record
     * @returns A Vendor Bill Record
    */
    function createItemReceiptFromPO(poID) {
        let functionName = "createItemReceiptFromPO";
        let itemReceiptRec = null;
        try{        
            itemReceiptRec = record.transform({
                fromType: record.Type.PURCHASE_ORDER,
                fromId: parseInt(poID),
                toType: record.Type.ITEM_RECEIPT,
            });
        }catch(error){
            log.error(functionName, "Error creating Item Receipt Record: " + JSON.stringify(error.message));
            return null;
        }

        return itemReceiptRec;
    }

    /**
     * If the PO has a value in the custom field "custbody_bsp_isg_order_type" and that value is
     * "Dropship", then return true. Otherwise, return false.
     * @param poID - The internal ID of the Purchase Order
     * @returns a boolean value.
    */
    function isDropShip(poID){
        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'custbody_bsp_isg_order_type'
        });
        if(poFields && poFields.custbody_bsp_isg_order_type && poFields.custbody_bsp_isg_order_type[0]){
            return poFields.custbody_bsp_isg_order_type[0].text == "Dropship";
        }
        return false;
    }

    /**
     * If the PO has a value in the custom field "custbody_bsp_isg_order_type" and that value is
     * "WrapAndLabel", then return true. Otherwise, return false.
     * @param poID - The internal ID of the Purchase Order
     * @returns a boolean value.
    */
    function isWrapAndLabel(poID){
        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'custbody_bsp_isg_order_type'
        });
        if(poFields && poFields.custbody_bsp_isg_order_type && poFields.custbody_bsp_isg_order_type[0]){
            return poFields.custbody_bsp_isg_order_type[0].text == "Wrap and Label";
        }
        return false;
    }

    /**
     * If the PO has a value in the custom field "custbody_bsp_isg_autoreceived" and that value is
     * "true", then return true. Otherwise, return false.
     * @param poID - The internal ID of the Purchase Order
     * @returns a boolean value.
    */
    function isAutoreceive(poID){
        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'custbody_bsp_isg_autoreceived'
        });
        if(poFields && poFields.custbody_bsp_isg_autoreceived){
            return poFields.custbody_bsp_isg_autoreceived == true;
        }
        return false;
    }

    /**
     * It takes a PO ID and returns the Sales Order ID that the PO was created from.
     * @param poID - The internal ID of the Purchase Order record
     * @returns The Sales Order ID
    */
    function getSalesOrderID(poID){
        let poFields = search.lookupFields({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            columns: 'createdfrom'
        });
        if(poFields && !isEmpty(poFields.createdfrom)){
            return poFields.createdfrom[0].value;
        }
        return null;
    }

    /**
     * This function takes in a PO ID, an array of items that have been partially shipped, and an array of
     * items that have not been shipped. It then loops through the arrays and sets the "isclosed" field to
     * true for each item in the arrays
     * @param poID - The internal ID of the Purchase Order
     * @param linesPartiallyShipped - An array of objects that contain the item ID and the quantity that
     * was shipped.
     * @param itemsNotShipped - An array of objects that contain the item ID and the quantity that was not
     * shipped.
    */
    function updatePOlines(poID, linesPartiallyShipped, itemsNotShipped){
        let purchaseOrderRec = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(poID),
            isDynamic: true
        });

        for(let i = 0; i < linesPartiallyShipped.length; i++){
            let item = linesPartiallyShipped[i];
            let itemID = item.itemID;
            let itemQty = item.quantityShipped;
            let lineNum = purchaseOrderRec.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: itemID
            });

            purchaseOrderRec.selectLine({
                sublistId: 'item',
                line: lineNum
            });

            purchaseOrderRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: itemQty
            });
            purchaseOrderRec.commitLine({
                sublistId: "item",
            });
        }

        if(itemsNotShipped.length > 0){
            let itemCount = purchaseOrderRec.getLineCount({
                sublistId: 'item'
            });
            for(let i = (itemCount - 1); i >= 0; i--){
                let itemID = purchaseOrderRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if(notShipped(itemsNotShipped, itemID)){
                    purchaseOrderRec.removeLine({
                        sublistId: 'item',
                        line: i,
                   });
                }
            }
        }

        purchaseOrderRec.save();
        log.debug("updatePOlines", `Purchase Order lines quantity updated`);
    }

    function notShipped(itemsNotShipped, itemID){
        for (let index = 0; index < itemsNotShipped.length; index++) {
            const element = itemsNotShipped[index];
            if(element.itemID == itemID)
                return true;
        }
        return false;
    }


    function fetchItemUOM(transmissionData){
        let purchaseOrderItems = transmissionData.data.purchaseOrder.items;
        let itemArray = purchaseOrderItems.map((i) => i.itemID);

        const customrecord_bsp_isg_item_acct_dataSearchObj = search.create({
            type: "customrecord_bsp_isg_item_acct_data",
            filters:
            [
               ["custrecord_bsp_isg_parent_item","anyof",itemArray]
            ],
            columns:
            [
               search.createColumn({name: "custrecord_bsp_isg_parent_item", label: "Item"}),
               search.createColumn({name: "custrecord_bsp_isg_contract_code_uom", label: "UOM"})
            ]
        });

        customrecord_bsp_isg_item_acct_dataSearchObj.run().each(function(result){
            let itemID = result.getValue("custrecord_bsp_isg_parent_item");
            let uom = result.getValue("custrecord_bsp_isg_contract_code_uom");
            let index = findItemIndex(purchaseOrderItems, itemID);
            if(index >= 0){
                purchaseOrderItems[index].itemUOM = uom;
            }
            return true;
        });

        transmissionData.data.purchaseOrder.items = purchaseOrderItems;
        return transmissionData;
    }

    /**
     * Get all results from a saved search
     * @param {*} objSavedSearch 
     * @returns 
    */
    function searchAll(objSavedSearch) {
        let title = "searchAll";
        let arrReturnSearchResults = [];
        try {
            let objResultset = objSavedSearch.run();
            let intSearchIndex = 0;
            let objResultSlice = null;
            let maxSearchReturn = 1000;

            let maxResults = 0;

            do {
                let start = intSearchIndex;
                let end = intSearchIndex + maxSearchReturn;
                if (maxResults && maxResults <= end) {
                    end = maxResults;
                }
                objResultSlice = objResultset.getRange(start, end);

                if (!objResultSlice) {
                    break;
                }

                arrReturnSearchResults = arrReturnSearchResults.concat(objResultSlice);
                intSearchIndex = intSearchIndex + objResultSlice.length;

                if (maxResults && maxResults == intSearchIndex) {
                    break;
                }
            } while (objResultSlice.length >= maxSearchReturn);
        } catch (error) {
            log.error(title, error.toString());
        }
        return arrReturnSearchResults;
    }

    /**
     * It takes a JavaScript Date object and returns a string in the format of an XML dateTime.
     * @param date - The date to be converted to XML format.
     * @returns The date in ISO format.
    */
    function getXMLDate(date){
        return date.toISOString().slice(0, 19);
    }

    
    /**
     * Check for Empty value
     * @param {*} value 
     * @returns 
    */
	function isEmpty(value) {
		return (
			value === "" ||
			value == null ||
			value == undefined ||
			value == "null" ||
			value == "undefined" ||
			(value.constructor === Array && value.length == 0) ||
			(value.constructor === Object &&
				(function (v) {
					for (let k in v) return false;
					return true;
				})(value))
		);
	}

    return {
        transmitionPOStatus: transmitionPOStatus,
        createPurchaseOrders: createPurchaseOrders,
        getPurchaseOrdersForTransmission: getPurchaseOrdersForTransmission,
        updatePOtransmissionStatus: updatePOtransmissionStatus,
        setPOMessageID: setPOMessageID,
        deletePO: deletePO,
        findPObyNumber: findPObyNumber,
        fetchItemUOM: fetchItemUOM,
        getQueueOfPO: getQueueOfPO,
        getVendor: getVendor,
        getTransmissionFields: getTransmissionFields,
        isDropShip: isDropShip,
        isWrapAndLabel: isWrapAndLabel,
        isAutoreceive: isAutoreceive,
        getSalesOrderID: getSalesOrderID,
        createBillFromPO: createBillFromPO,
        createItemFulfillmentFromPO: createItemFulfillmentFromPO,
        createItemReceiptFromPO: createItemReceiptFromPO,
        updatePOlines: updatePOlines
	};
});
