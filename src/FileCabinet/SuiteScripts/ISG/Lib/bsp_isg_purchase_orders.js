/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record'], function (search, record) {

    const PO_TRANSMITION_STATUSES = Object.freeze({
        pendingTransmission: 1,
        pendingAcknowledment: 2,
        acknowledged: 3,
        transmissionFailed: 4,
        transmitting: 5,
        acknowledgmentFailed: 6
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
                   search.createColumn({
                      name: "entityid",
                      join: "customer",
                      label: "Name"
                   }),
                   search.createColumn({
                      name: "addressee",
                      join: "customer",
                      label: "Addressee"
                   }),
                   search.createColumn({
                      name: "address1",
                      join: "customer",
                      label: "Address 1"
                   }),
                   search.createColumn({
                      name: "city",
                      join: "customer",
                      label: "City"
                   }),
                   search.createColumn({
                      name: "state",
                      join: "customer",
                      label: "State/Province"
                   }),
                   search.createColumn({
                      name: "zipcode",
                      join: "customer",
                      label: "Zip Code"
                   }),
                   search.createColumn({
                      name: "countrycode",
                      join: "customer",
                      label: "Country Code"
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
                   search.createColumn({
                      name: "entityid",
                      join: "customer",
                      label: "Name"
                   }),
                   search.createColumn({
                      name: "addressee",
                      join: "customer",
                      label: "Addressee"
                   }),
                   search.createColumn({
                      name: "address1",
                      join: "customer",
                      label: "Address 1"
                   }),
                   search.createColumn({
                      name: "city",
                      join: "customer",
                      label: "City"
                   }),
                   search.createColumn({
                      name: "state",
                      join: "customer",
                      label: "State/Province"
                   }),
                   search.createColumn({
                      name: "zipcode",
                      join: "customer",
                      label: "Zip Code"
                   }),
                   search.createColumn({
                      name: "countrycode",
                      join: "customer",
                      label: "Country Code"
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
            let customer = {
                companyName: element.getValue({name: "entityid", join: "customer"}),
                addressee: element.getValue({name: "addressee", join: "customer"}),
                address1: element.getValue({name: "address1", join: "customer"}),
                city: element.getValue({name: "city", join: "customer"}),
                state: element.getValue({name: "state", join: "customer"}),
                zipcode: element.getValue({name: "zipcode", join: "customer"}),
                countrycode: element.getValue({name: "countrycode", join: "customer"})
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
                    customer: customer,
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
        let poID = null;

        let purchaseOrderRec = record.create({
            type: record.Type.PURCHASE_ORDER,
            isDynamic: true,
            defaultValues: {
                'soid' : poData.salesOrderID,
                'dropship' : 'T',
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
            value: parseInt(poData.routeCode.location),
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
                if(itemNotIncludedInTransmission(item, poData.itemData)){
                    log.debug("createPurchaseOrders", `Item ${item} will be removed`);
                    purchaseOrderRec.removeLine({
                        sublistId: 'item',
                        line: i,
                   });
                }
            }
            poID = purchaseOrderRec.save();
        }else{
            throw `There was an unexpected Error while trynig to create a PO for Sales Order ID ${poData.salesOrderID}`;
        }
       

        return poID;
    }

    /**
     * If the itemID is not in the items array, return true, otherwise return false.
     * @param itemID - The ID of the item you want to check
     * @param items - This is an array of objects that are to be transmitted.
     * @returns a boolean value.
    */
    function itemNotIncludedInTransmission(itemID, items){
        for (let index = 0; index < items.length; index++) {
            const element = JSON.parse(items[index]);
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
        if(poFields && poFields.custbody_bsp_isg_adot){
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

    return {
        transmitionPOStatus: transmitionPOStatus,
        createPurchaseOrders: createPurchaseOrders,
        getPurchaseOrdersForTransmission: getPurchaseOrdersForTransmission,
        updatePOtransmissionStatus: updatePOtransmissionStatus,
        setPOMessageID: setPOMessageID,
        deletePO: deletePO,
        findPObyNumber: findPObyNumber,
        getQueueOfPO: getQueueOfPO,
        getVendor: getVendor,
        getTransmissionFields: getTransmissionFields,
        createBillFromPO: createBillFromPO
	};
});
