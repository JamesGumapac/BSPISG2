/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './bsp_transmitions_util.js'], function (search, record, BSPTransmitionsUtil) {

    const PO_TRANSMITION_STATUSES = Object.freeze({
        pendingTransmission: 1,
        pendingAcknowledment: 2,
        completed: 3,
        transmissionFailed: 4,
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
                custbody_bsp_po_transmission_status: status
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
                custbody_bsp_transmission_msg_id: serviceBodyResponse.Id
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
    function getPurchaseOrdersForTransmission(transmitionQueueID){
        let purchaseOrderList = [];
        let purchaseOrderSearchObj = search.create({
            type: "purchaseorder",
            filters:
            [
               ["type","anyof","PurchOrd"], 
               "AND", 
               ["mainline","is","F"], 
               "AND", 
               ["custbody_bsp_transm_queue_id","is",transmitionQueueID],
               "AND", 
               ["custbody_bsp_po_transmission_status","anyof",PO_TRANSMITION_STATUSES.pendingTransmission]
            ],
            columns:
            [
               search.createColumn({name: "tranid", label: "Document Number"}),
               search.createColumn({name: "custbody_bsp_lb_route_code", label: "Route Code"}),
               search.createColumn({name: "line", label: "Line ID"}),
               search.createColumn({name: "item", label: "Item"}),
               search.createColumn({name: "quantity", label: "Quantity"}),
               search.createColumn({name: "rate", label: "Item Rate"}),
               search.createColumn({name: "unitabbreviation", label: "Units"}),
               search.createColumn({name: "trandate", label: "Date"}),
               search.createColumn({name: "createdfrom", label: "Sales Order"}),
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

        let poResultList = BSPTransmitionsUtil.searchAll(purchaseOrderSearchObj);
        poResultList.forEach(element => {
            let purchaseOrderID = element.id;
            let purchaseOrderNumber = element.getValue("tranid");
            let purchaseOrderDate = element.getValue("trandate");
            let salesOrderID = element.getValue("createdfrom");
            let salesOrder = element.getText("createdfrom");
            let routeCodeID = element.getValue("custbody_bsp_lb_route_code");
            let routeCode = element.getText("custbody_bsp_lb_route_code");
            let currency = element.getValue({name: "symbol", join: "Currency"});
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
                    purchaseOrderDate: BSPTransmitionsUtil.getXMLDate(new Date(purchaseOrderDate)),
                    salesOrderID: salesOrderID,
                    salesOrder: salesOrder,
                    routeCodeID: routeCodeID,
                    routeCode: routeCode,
                    currency: currency,
                    customer: customer,
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
            value: transactionForm,
        });

        purchaseOrderRec.setValue({
            fieldId: "location",
            value: parseInt(poData.routeCode.location),
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_autoreceived",
            value: poData.autoreceive,
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_transmission_acct_num",
            value: poData.account,
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_transmission_loc",
            value: poData.transmissionLocation,
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_transm_queue_id",
            value: poData.transmitionQueueID,
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_po_transmission_status",
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

    return {
        transmitionPOStatus: transmitionPOStatus,
        createPurchaseOrders: createPurchaseOrders,
        getPurchaseOrdersForTransmission: getPurchaseOrdersForTransmission,
        updatePOtransmissionStatus: updatePOtransmissionStatus,
        setPOMessageID: setPOMessageID
	};
});
