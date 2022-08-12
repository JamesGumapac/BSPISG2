/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './lodash.min.js', 'N/task', 'N/format', 'N/config'], function (search, record, lodash, task, format, config) {
    
    const CONTANTS = Object.freeze({
        actionCode: "R",
        documentControlNumber: "00001",
        transmitionStatusNotStarted: 1
    });

    /**
     * Returns Integration Project Constants
     * @returns 
    */
    function constants(){
        return CONTANTS;
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
            value: CONTANTS.transmitionStatusNotStarted,
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
        if(resultSearch[0].getValue("custrecord_bsp_transmition_status") == CONTANTS.transmitionStatusNotStarted){
            transmitionQueueRecID = resultSearch[0].getValue("internalid");
        }
         
        return transmitionQueueRecID;
    }


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
        isEmpty:isEmpty,
        getProp: getProp,
        getTransmitions: getTransmitions,
        createTransmitionQueueRecord: createTransmitionQueueRecord,
        findNextTransmitionInQueue: findNextTransmitionInQueue,
        getTransmitionRecordFromQueue: getTransmitionRecordFromQueue,
        getCompanyInfo: getCompanyInfo,
        getOrdersData: getOrdersData
	};
});
