/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record'], function (search, record) {
    
    const CONTANTS = Object.freeze({
        essendant : "Essendant Inc"
    });

    const TRANSMITION_QUEUE_STATUSES = Object.freeze({
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
     * Returns Transmition Queue Status Constants
     * @returns 
    */   
    function transmitionQueueStatus(){
        return TRANSMITION_QUEUE_STATUSES;
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
            value: TRANSMITION_QUEUE_STATUSES.notStarted,
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
        if(resultSearch[0].getValue("custrecord_bsp_transmition_status") == TRANSMITION_QUEUE_STATUSES.notStarted){
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
    function updateTransmissionQueueStatus(transmitionQueueRecID, status){
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
        let savedSearch, vendor, location, autoreceive, accountNumber, essendantADOT = null;

        let transmitionFieldsObj = search.lookupFields({
            type: "customrecord_bsp_lb_transmition",
            id: transmitionRecID,
            columns: [
                'custrecord_bsp_lb_transmition_ss', 
                'custrecord_bsp_lb_vendor_account', 
                'custrecord_bsp_lb_transmition_loc', 
                'custrecord_bsp_autoreceive',
                'custrecord_bsp_lb_acct_number',
                'custrecord_bsp_lb_essendant_adot'
            ]
        });

        if(transmitionFieldsObj){
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_transmition_ss))){
                savedSearch = transmitionFieldsObj.custrecord_bsp_lb_transmition_ss[0].value;
            }    
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_vendor_account))){
                vendor = transmitionFieldsObj.custrecord_bsp_lb_vendor_account[0].value;
            } 
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_transmition_loc))){
                location = transmitionFieldsObj.custrecord_bsp_lb_transmition_loc;
            }  
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_autoreceive))){
                autoreceive = transmitionFieldsObj.custrecord_bsp_autoreceive;
            } 
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_acct_number))){
                accountNumber = transmitionFieldsObj.custrecord_bsp_lb_acct_number[0];
            }  
            if(!(isEmpty(transmitionFieldsObj.custrecord_bsp_lb_essendant_adot))){
                essendantADOT = transmitionFieldsObj.custrecord_bsp_lb_essendant_adot;
            }      
        }
        
        let transmitionFields = {
            transmitionRecID: transmitionRecID,
            savedSearch: savedSearch, 
            vendor: vendor, 
            location: location, 
            autoreceive: autoreceive,
            accountNumber: accountNumber,
            essendantADOT: essendantADOT
        };

		return transmitionFields;
    }

    /**
     * This function takes a vendor ID and returns an object containing the trading partner settings for
     * that vendor.
     * @param vendor - The vendor ID of the vendor you want to get the trading partner info for.
     * @returns the tradingPartnerData object.
    */
    function getTradingPartnerInfo(vendor){
        let tradingPartnerData = null;
        const tradingPartnerSearchObj = search.create({
            type: "vendor",
            filters:
            [
               ["internalid","anyof",vendor], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({
                  name: "internalid",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Internal ID"
               }),
               search.createColumn({
                  name: "name",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Name"
               }),
               search.createColumn({
                  name: "custrecord_bsp_lb_as2_id",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "AS2 Identifier"
               }),
               search.createColumn({
                  name: "custrecord_bsp_compress_msg",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Compress Message"
               }),
               search.createColumn({
                  name: "custrecord_bsp_encrypt_msg",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Encrypt Message"
               }),
               search.createColumn({
                  name: "custrecord_bsp_encryption_algorithm",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Encryption Algorithm"
               }),
               search.createColumn({
                  name: "custrecord_bsp_mdn_to",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "MDN to"
               }),
               search.createColumn({
                  name: "custrecord_bsp_sign_msg",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Sign Message"
               }),
               search.createColumn({
                  name: "custrecord_bsp_signature_algorith",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Signature Algorithm"
               }),
               search.createColumn({
                  name: "custrecord_bsp_lb_target_url",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Target URL"
               }),
               search.createColumn({
                  name: "custrecord_bsp_template_xml_file",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Template XML file"
               }),
               search.createColumn({
                  name: "custrecord_bsp_transm_output_folder_id",
                  join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                  label: "Template XML file"
               }),
               search.createColumn({
                name: "custrecord_bsp_trading_partner_act_code",
                join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS",
                label: "Action Code"
                })
            ]
        });
        tradingPartnerSearchObj.run().each(function(result){
            let id = result.getValue({name: "internalid", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let name = result.getValue({name: "name", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let as2Identifier = result.getValue({name: "custrecord_bsp_lb_as2_id", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let compressMessage = result.getValue({name: "custrecord_bsp_compress_msg", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let encryptMessage = result.getValue({name: "custrecord_bsp_encrypt_msg", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let encryptionAlgorithm = result.getValue({name: "custrecord_bsp_encryption_algorithm", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let mdnTo = result.getValue({name: "custrecord_bsp_mdn_to", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let signMessage = result.getValue({name: "custrecord_bsp_sign_msg", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let signatureAlgorithm = result.getValue({name: "custrecord_bsp_signature_algorith", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let targetURL = result.getValue({name: "custrecord_bsp_lb_target_url", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let xmlTemplateFileID = result.getValue({name: "custrecord_bsp_template_xml_file", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let transmissionOutputFolderID = result.getValue({name: "custrecord_bsp_transm_output_folder_id", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            let actionCode = result.getValue({name: "custrecord_bsp_trading_partner_act_code", join: "CUSTENTITY_BSP_LB_TRADING_PARTN_SETTINGS"});
            
            tradingPartnerData = {
                id: id,
                name: name,
                as2Identifier: as2Identifier,
                compressMessage: compressMessage,
                encryptMessage: encryptMessage,
                encryptionAlgorithm: encryptionAlgorithm,
                mdnTo: mdnTo,
                signMessage: signMessage,
                signatureAlgorithm: signatureAlgorithm,
                targetURL: targetURL,
                xmlTemplateFileID: xmlTemplateFileID,
                transmissionOutputFolderID: transmissionOutputFolderID,
                actionCode: actionCode
            }
            return true;
        });
        return tradingPartnerData;
    }

    /**
     * It takes a record ID and a document control number, increments the document control number by 1, and
     * then updates the record with the new document control number.
     * @param id - the internal id of the record you want to update
     * @param documentControlNumber - The document control number that is being used to generate the BOD
     * ID.
    */
    function updateTradingPartnerBODId(id, documentControlNumber){
        let bodID =  parseInt(documentControlNumber);
        let newBODid = bodID + 1;
        newBODid = ((newBODid == 100000) ? 1 : newBODid);

        let newBODidString = String(newBODid).padStart(5, '0'); 

        record.submitFields({
            type: "customrecord_bsp_lb_trading_partner",
            id: parseInt(id),
            values: {
                custrecord_bsp_trading_partner_bodid: newBODidString
            }
        });
    }

    /**
     * It takes a trading partner ID and returns the BOD ID associated with that trading partner.
     * @param id - The internal ID of the record you want to look up.
     * @returns the value of the field "custrecord_bsp_trading_partner_bodid" from the record
     * "customrecord_bsp_lb_trading_partner"
    */
    function getTradingPartnerBODId(id){
        let bodID = null;
        let objTradingPartnerField = search.lookupFields({
            type: "customrecord_bsp_lb_trading_partner",
            id: parseInt(id),
            columns: 'custrecord_bsp_trading_partner_bodid'
        });

        if(objTradingPartnerField && objTradingPartnerField.custrecord_bsp_trading_partner_bodid){
            bodID = objTradingPartnerField.custrecord_bsp_trading_partner_bodid;
        }
        return bodID;
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
     * This function creates a custom record of type "customrecord_bsp_edi_service_logs" and sets the
     * values of the fields on the record
     * @param serviceURL - The URL of the service you're calling
     * @param method - HTTP method (GET, POST, PUT, DELETE)
     * @param request 
     * @param respCode 
     * @param respHeaders 
     * @param respBody 
    */
    function createServiceLog(serviceURL, method, request, respCode, respHeaders, respBody){
        let functionName = "createServiceLog";
        let serviceLogRec = record.create({
            type: "customrecord_bsp_edi_service_logs",
        });

        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_as2_service_url",
            value: serviceURL,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_edi_http_method",
            value: method,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_as2_request",
            value: request,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_edi_response_code",
            value: respCode,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_edi_response_header",
            value: respHeaders,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_edi_response_body",
            value: respBody,
        });

        let servicelogRecID = serviceLogRec.save();
        log.debug(functionName, "Service Log Created: " + servicelogRecID + " - method: " + method);
    }

    /**
     * It takes a purchase order number and returns a string that is the purchase order number. 
     * Later to be used as fileName.
     * @param purchaseOrderNumber - The purchase order number that you want to process.
     * @returns A string.
    */
    function buildFileName(purchaseOrderNumber){
        return `ProcessPO${purchaseOrderNumber}`;
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
        constants: constants,
        transmitionQueueStatus: transmitionQueueStatus,
        isEmpty:isEmpty,
        getProp: getProp,
        searchAll: searchAll,
        getTransmitions: getTransmitions,
        createTransmitionQueueRecord: createTransmitionQueueRecord,
        findNextTransmitionInQueue: findNextTransmitionInQueue,
        getTransmitionRecordFromQueue: getTransmitionRecordFromQueue,
        updateTransmissionQueueStatus: updateTransmissionQueueStatus,
        getFieldsFromTransmitionRecord: getFieldsFromTransmitionRecord,
        getTradingPartnerInfo: getTradingPartnerInfo,
        getTradingPartnerBODId: getTradingPartnerBODId,
        updateTradingPartnerBODId: updateTradingPartnerBODId,
        createErrorLog:createErrorLog,
        createServiceLog: createServiceLog,
        buildFileName: buildFileName,
        getXMLDate: getXMLDate
	};
});
