/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './lodash.min.js', 'N/task', 'N/format', 'N/config'], function (search, record, lodash, task, format, config) {
    
    const CONTANTS = Object.freeze({
        actionCode: "R",
        documentControlNumber: "00001"
    });

    const TRANSMITION_STATUSES = Object.freeze({
        notStarted: 1,
        transmitting: 2,
        transmitted: 3,
        acknowledged: 4,
        complete: 5
    });
    
    /**
     * Returns Integration Project Constants
     * @returns 
    */
    function constants(){
        return CONTANTS;
    }

    /**
     * Returns Transmition Status Constants
     * @returns 
    */   
    function transmitionStatus(){
        return TRANSMITION_STATUSES;
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

    /**
     * Returns value of property
     * @param {*} obj 
     * @param {*} prop 
     * @returns 
    */
    function getProp(obj, prop) {
        if (typeof obj !== "object") throw "getProp: obj is not an object";
        if (typeof prop !== "string") throw "getProp: prop is not a string";

        // Replace [] notation with dot notation
        prop = prop.replace(/\[["'`](.*)["'`]\]/g, ".$1");

        return prop
            .split(".")
            .reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
    }

    /**
     * It takes a deployment ID and returns an array of objects containing the transmition scheduler ID,
     * transmition scheduler name, transmition group ID, transmition group name, transmition ID, and
     * transmition name.
     * @param deploymentID - The ID of the deployment record
     * @returns An array of objects.
    */
    function getTransmitions(deploymentID){
        let transmitions = [];

        const transmitionGroupSearchObj = search.create({
            type: "customrecord_bsp_lb_transmition_group",
            filters:
            [
               ["custrecord_bsp_lb_transm_scheduler.custrecord_bsp_transm_schd_deployment_id","is",deploymentID]
            ],
            columns:
            [
               search.createColumn({
                  name: "internalid",
                  join: "CUSTRECORD_BSP_LB_TRANSM_SCHEDULER",
                  label: "Transmition Scheduler ID"
               }),
               search.createColumn({
                  name: "name",
                  join: "CUSTRECORD_BSP_LB_TRANSM_SCHEDULER",
                  label: "Transmition Scheduler Name"
               }),
               search.createColumn({
                  name: "internalid",
                  sort: search.Sort.ASC,
                  label: "Transmition Group ID"
               }),
               search.createColumn({name: "name", label: "Transmition Group Name"}),
               search.createColumn({
                  name: "internalid",
                  join: "CUSTRECORD_BSP_LB_TRANSMITION_GROUP",
                  sort: search.Sort.ASC,
                  label: "Transmition ID"
               }),
               search.createColumn({
                  name: "name",
                  join: "CUSTRECORD_BSP_LB_TRANSMITION_GROUP",
                  label: "Transmition Name"
               })
            ]
         });
         transmitionGroupSearchObj.run().each(function(result){
            let transmitionSchedulerId = result.getValue({name: 'internalid', join: 'CUSTRECORD_BSP_LB_TRANSM_SCHEDULER'});
            let transmitionSchedulerName = result.getValue({name: 'name', join: 'CUSTRECORD_BSP_LB_TRANSM_SCHEDULER'});
            let transmitionGroupId = result.getValue({name: 'internalid'});
            let transmitionGroupName = result.getValue({name: 'name'});
            let transmitionId = result.getValue({name: 'internalid', join: 'CUSTRECORD_BSP_LB_TRANSMITION_GROUP'});
            let transmitionName = result.getValue({name: 'name', join: 'CUSTRECORD_BSP_LB_TRANSMITION_GROUP'});

            transmitions.push({
                transmitionSchedulerId: transmitionSchedulerId,
                transmitionSchedulerName: transmitionSchedulerName,
                transmitionGroupId: transmitionGroupId,
                transmitionGroupName: transmitionGroupName,
                transmitionId: transmitionId,
                transmitionName: transmitionName
            });
            return true;
         });

        return transmitions;
    }

    /**
     * It creates a record of type "customrecord_bsp_transmition_queue".
     * The function then saves the record and returns the id of the saved record.
     * @param data - {
     * @returns The record id of the newly created record.
    */
    function createTransmitionQueueRecord(data){
        let transmitionQueueRec = record.create({
            type: "customrecord_bsp_transmition_queue",
        });

        transmitionQueueRec.setValue({
            fieldId: "custrecord_bsp_transmition_schd",
            value: parseInt(data.transmitionSchedulerId),
        });
        transmitionQueueRec.setValue({
            fieldId: "custrecord_bsp_transmition_group",
            value: parseInt(data.transmitionGroupId),
        });
        transmitionQueueRec.setValue({
            fieldId: "custrecord_bsp_transmition",
            value: parseInt(data.transmitionId),
        });
        transmitionQueueRec.setValue({
            fieldId: "custrecord_bsp_transmition_status",
            value: TRANSMITION_STATUSES.notStarted,
        });
        let transmitionQueueRecId = transmitionQueueRec.save();
        return transmitionQueueRecId;
    }

    /**
     * It searches for a Transaction queue record in the queue and returns the internal ID of the first record it finds.
     * @returns The internal ID of the first record in the queue if it has a status of "Not Started"
    */
    function findNextTransmitionInQueue(){
        let transmitionQueueRecID = null;
        const transmitionQueueSearchObj = search.create({
        type: "customrecord_bsp_transmition_queue",
        filters:[],
        columns:
        [
            search.createColumn({
                name: "scriptid",
                sort: search.Sort.ASC,
                label: "Script ID"
            }),
            search.createColumn({name: "internalid", label: "Internal ID"}),
            search.createColumn({name: "custrecord_bsp_transmition_status", label: "Status"})
        ]
        });

        let resultSearch = searchAll(transmitionQueueSearchObj);
        if(resultSearch[0].getValue("custrecord_bsp_transmition_status") == TRANSMITION_STATUSES.notStarted){
            transmitionQueueRecID = resultSearch[0].getValue("internalid");
        }
         
        return transmitionQueueRecID;
    }


    /**
     * It takes THE Queue Rec ID and returns the Tranmsition Rec linked to that Queue.
     * @param transmitionQueueRecID - The internal ID of the custom record that is used to queue up the
     * transmition.
     * @returns The transmitionRec is being returned.
    */
    function getTransmitionRecordFromQueue(transmitionQueueRecID){
        let transmitionRec = null;

        let transmitionObj = search.lookupFields({
            type: "customrecord_bsp_transmition_queue",
            id: transmitionQueueRecID,
            columns: 'custrecord_bsp_transmition'
        });

        if(transmitionObj && transmitionObj.custrecord_bsp_transmition){
            transmitionRec = transmitionObj.custrecord_bsp_transmition[0];
        }
        
		return transmitionRec;
    }


    /**
     * It updates the status of a record in the custom record "BSP Transmition Queue" to the status passed
     * in.
     * @param transmitionQueueRecID - The internal ID of the record in the custom record.
     * @param status - The status of the transmition queue record.
    */
    function updateTransmitionQueueStatus(transmitionQueueRecID, status){
        record.submitFields({
            type: "customrecord_bsp_transmition_queue",
            id: transmitionQueueRecID,
            values: {
                custrecord_bsp_transmition_status: status
            }
        });
    }


    /**
     * This function takes a transmition record ID and returns an object with the fields from the transmition record.
     * @param transmitionRecID - The ID of the custom record that holds the fields to be returned.
     * @returns An object with the following properties:
     * - savedSearch
     * - vendor
     * - location
     */
    function getFieldsFromTransmitionRecord(transmitionRecID){
        let savedSearch, vendor, location, autoreceive = null;

        let transmitionFieldsObj = search.lookupFields({
            type: "customrecord_bsp_lb_transmition",
            id: transmitionRecID,
            columns: ['custrecord_bsp_lb_transmition_ss', 'custrecord_bsp_lb_vendor_account', 'custrecord_bsp_lb_transmition_loc', 'custrecord_bsp_autoreceive']
        });

        if(transmitionFieldsObj){
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_transmition_ss))){
                log.debug("getFieldsFromTransmitionRecord", `Getting Seaved Search: ${transmitionFieldsObj.custrecord_bsp_lb_transmition_ss[0].text}`);
                savedSearch = transmitionFieldsObj.custrecord_bsp_lb_transmition_ss[0].value;
            }    
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_vendor_account))){
                log.debug("getFieldsFromTransmitionRecord", `Getting Vendor: ${transmitionFieldsObj.custrecord_bsp_lb_vendor_account[0].text}`);
                vendor = transmitionFieldsObj.custrecord_bsp_lb_vendor_account[0].value;
            } 
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_transmition_loc))){
                log.debug("getFieldsFromTransmitionRecord", `Getting Location: ${transmitionFieldsObj.custrecord_bsp_lb_transmition_loc}`);
                location = transmitionFieldsObj.custrecord_bsp_lb_transmition_loc;
            }  
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_autoreceive))){
                log.debug("getFieldsFromTransmitionRecord", `Getting autoreceive checkbox: ${transmitionFieldsObj.custrecord_bsp_autoreceive}`);
                autoreceive = transmitionFieldsObj.custrecord_bsp_autoreceive;
            }     
        }
        
        let transmitionFields = {savedSearch: savedSearch, vendor: vendor, location: location, autoreceive: autoreceive};
		return transmitionFields;
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
            fieldId: "location",
            value: parseInt(poData.routeCode.location),
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_autoreceived",
            value: poData.autoreceive,
        });

        purchaseOrderRec.setValue({
            fieldId: "custbody_bsp_transm_queue_id",
            value: poData.transmitionQueueID,
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
               ["custbody_bsp_transm_queue_id","is",transmitionQueueID]
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

        let poResultList = searchAll(purchaseOrderSearchObj);
        poResultList.forEach(element => {
            let purchaseOrderID = element.id;
            let routeCode = element.getValue("custbody_bsp_lb_route_code");
            let currency = element.getValue({name: "symbol", join: "Currency"});
            let customer = {
                companyName: element.getValue({name: "entityid", join: "customer"}),
                addressee: element.getValue({name: "addressee", join: "customer"}),
                address1: element.getValue({name: "address1", join: "customer"}),
                city: element.getValue({name: "city", join: "customer"}),
                zipcode: element.getValue({name: "zipcode", join: "customer"}),
                countrycode: element.getValue({name: "countrycode", join: "customer"})
            }
            let item = {
                itemLine: element.getValue("line"),
                itemID: element.getValue("item"),
                itemQuantity:element.getValue("quantity"),
                itemRate: element.getValue("rate"),
                itemUOM: element.getValue("unitabbreviation")
           }   
           
           let poIndex = getPOindex(purchaseOrderList, purchaseOrderID);
           if(poIndex){
                purchaseOrderList[poIndex].items.push(item);
           }else{
                purchaseOrderList.push({
                    purchaseOrderID: purchaseOrderID,
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
        return null;
    }

   /**
    * It creates an Error Log custom record.
    * The function sets
    * @param errorSource - The name of the script that is calling the function.
    * @param errorMessage - The error message that you want to display in the error log.
    * @param errorDetail - The error object.
    */
    function createErrorLog(errorSource, errorMessage, errorDetail){
        let errorLogRec = record.create({
            type: "customrecord_bsp_transm_error_logs",
        });

        errorLogRec.setValue({
            fieldId: "custrecord_bsp_transm_error_source",
            value: errorSource,
        });
        errorLogRec.setValue({
            fieldId: "custrecord_bsp_transm_error_message",
            value: errorMessage,
        });
        errorLogRec.setValue({
            fieldId: "custrecord_bsp_transm_error_detail",
            value: errorDetail,
        });
        
        errorLogRec.save();
    }

    /**
     * It takes a search ID, runs the search, and returns an array of Orders that contain the data from
     * the search.
     * @param searchId - The id of the saved search you want to run.
     * @returns An array of Orders.
    */
    function getOrdersData(searchId){
        let orders = [];
        let ordersSearch = search.load({id: searchId});

        ordersSearch.columns.push(search.createColumn({name: "shipaddress1", label: "Shipping Address 1"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddress2", label: "Shipping Address 2"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddress3", label: "Shipping Address 3"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddressee", label: "Shipping Addressee"}));
        ordersSearch.columns.push(search.createColumn({name: "shipcity", label: "Shipping City"}));
        ordersSearch.columns.push(search.createColumn({name: "shipstate", label: "Shipping State/Province"}));
        ordersSearch.columns.push(search.createColumn({name: "shipzip", label: "Shipping Zip"}));

        ordersSearch.run().each(function(result){  
            let salesOrderID = result.id;
            let salesOrderNumber = result.getValue({name: "tranid"});
            let orderDate = result.getValue({name: "datecreated"});
            let routeCodeID = result.getValue({name: "custbody_bsp_lb_route_code"});
            let routeCode = result.getText({name: "custbody_bsp_lb_route_code"});
            let accountNumber = result.getText({
                name: "custrecord_bsp_lb_account_number",
                join: 'CUSTBODY_BSP_LB_ROUTE_CODE'
            });

            let addr1 = result.getValue({name: "shipaddress1"});
            let addr2 = result.getValue({name: "shipaddress2"});
            let addr3 = result.getValue({name: "shipaddress3"});
            let city = result.getValue({name: "shipcity"});
            let state = result.getValue({name: "shipstate"});
            let zipCode = result.getValue({name: "shipzip"});
            let addressee = result.getValue({name: "shipaddressee"});

            let address = {
                addr1: addr1,
                addr2: addr2,
                addr3: addr3,
                city: city,
                state: state,
                zipCode: zipCode,
                addressee: addressee
            };

            let item = result.getText({name: "item"});
            let itemLineNumber = result.getValue({name: "line"});
            let itemQuantity = result.getValue({name: "quantity"});
            let itemUnitPrice = result.getValue({name: "rate"});

            if(_.indexOf(orders,salesOrderID) == -1){
                orders.push({
                    poID: '1',
                    poNumber: 'PO-1',
                    poDate: orderDate,
                    salesOrderNumber: salesOrderNumber,
                    salesOrderID: salesOrderID,
                    accountNumber: accountNumber,
                    routeCode: routeCode,
                    routeCodeID: routeCodeID,
                    vendorName: "Essendant Inc",
                    address: address,
                    items: [{
                        lineNumber: itemLineNumber,
                        itemNumber: item,
                        quantity: itemQuantity,
                        unitPrice: itemUnitPrice
                    }]
                })
            }else{
                orders[getOrderPosition(orders,salesOrderID)].items.push({
                    lineNumber: itemLineNumber,
                    itemNumber: item,
                    quantity: itemQuantity,
                    unitPrice: itemUnitPrice
                })
            }
            return true;
        });
        return orders;
    }

    /**
     * It returns the index of the order in the orders array that has the salesOrderID that matches the
     * salesOrderID passed in as a parameter.
     * @param orders - the array of orders
     * @param salesOrderID - The ID of the order you want to update.
     * @returns The index of the order in the orders array.
    */
    function getOrderPosition(orders, salesOrderID){
        for (let index = 0; index < orders.length; index++) {
            if(orders[index].salesOrderID == salesOrderID)  {
                return index;
            }
        }
        return -1;
    }

    /**
     * It returns the company name from the company information record.
     * @returns The company name.
    */
    function getCompanyInfo(){
        let companyInfo = config.load({
            type: config.Type.COMPANY_INFORMATION
        });
        let companyName = companyInfo.getValue({
            fieldId:'companyname'
        });
        companyName = companyName.replace("&","and");
        return companyName || null;
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

    return {
        constants: constants,
        transmitionStatus: transmitionStatus,
        isEmpty:isEmpty,
        getProp: getProp,
        searchAll: searchAll,
        getTransmitions: getTransmitions,
        createTransmitionQueueRecord: createTransmitionQueueRecord,
        findNextTransmitionInQueue: findNextTransmitionInQueue,
        getTransmitionRecordFromQueue: getTransmitionRecordFromQueue,
        updateTransmitionQueueStatus: updateTransmitionQueueStatus,
        getFieldsFromTransmitionRecord: getFieldsFromTransmitionRecord,
        createPurchaseOrders: createPurchaseOrders,
        getPurchaseOrdersForTransmission: getPurchaseOrdersForTransmission,
        createErrorLog:createErrorLog,
        getCompanyInfo: getCompanyInfo,
        getOrdersData: getOrdersData
	};
});
