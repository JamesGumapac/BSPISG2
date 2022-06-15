/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './lodash.min.js', 'N/task', 'N/format', 'N/xml'], function (search, record, lodash, task, format, xmlMod) {
    
    const API_CONSTANTS = Object.freeze({
        startIndex: 0,
        pageSize: 10,
        successCode: 200
    });

    const LOGICBLOCK_CONTANTS = Object.freeze({
        successStatus: "SUCCESS",
        errorStatus: "ERROR",
        errorCodeCreatingQueue: "ERROR_CREATING_QUEUE",
        errorMessageCreatingQueue: "An error has occurred creating Queue record.",
        errorMessageQueueAlreadyExists: "The Queue record already exists."
    });

    const REC_TYPES = Object.freeze({
        customer:  "Customer",
        salesOrder: "Sales Order",
        purchaseOrder: "Purchase Order",
        vendor:"Vendor",
        item: "Item",
        billingAddress: "Billing Address",
        shippingAddress: "Shipping Address"
    });

     /**
     * Returns Integration server constants
     * @returns 
     */
      function serverConstants(){
        return API_CONSTANTS;
    }

    /**
     * Returns Integration Project Constants
     * @returns 
    */
    function constants(){
        return LOGICBLOCK_CONTANTS;
    }

    /**
     * Returns Rec Types 
     * @returns 
    */
    function recTypes(){
        return REC_TYPES;
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
     * Returns NS Internal ID if exists in NS
     * @param {*} logicblockID 
     * @returns 
     */
    function getRecordInternalID(logicblockID){
        let netSuiteRecId = null;
        if(aqId){
            const mappingKeysSearchObj = search.create({
                type: "customrecord_bsp_lb_mapped_keys",
                filters:
                [
                    ["custrecord_bsp_lb_logicblock_id","is",logicblockID]
                ],
                columns:
                [
                    search.createColumn({name: "custrecord_bsp_lb_netsuite_id", label: "Internal NetSuite ID"})
                ]
            });
            let mappingKeysSearchResultCount = mappingKeysSearchObj.runPaged().count;
            if(mappingKeysSearchResultCount > 0){
                mappingKeysSearchObj.run().each(function(result){
                    netSuiteRecId = result.getValue({
                        name: "custrecord_bsp_lb_netsuite_id",
                    });
                    return true;
                });
            }
        }        
        return netSuiteRecId;
    }
    
    /**
     * Return Logicblock Integration settings
     * @param {*} settingRecID 
     * @returns 
    */
    function getIntegrationSettings(settingRecID) {
        let settings = null;

        settings = search.lookupFields({
            type: "customrecord_bsp_lb_integration_settings",
            id: settingRecID,
            columns: [
                "custrecord_bsp_lb_orders_service_url",
                "custrecord_bsp_lb_catalog_service_url",
                "custrecord_bsp_lb_get_orders_soap_action",
                "custrecord_bsp_lb_login_soap_action",
                "custrecord_bsp_lb_get_vend_soap_action",
                "custrecord_bsp_lb_user_id",
                "custrecord_bsp_lb_password",
                "custrecord_bsp_lb_last_runtime_exec"
            ]
        });
       
        return settings;
    }


    /**
     * Create Service Log Record with each API call
     * @param {*} endPoint 
     * @param {*} apiMethod 
     * @param {*} reqHeaders 
     * @param {*} reqBody 
     * @param {*} respCode 
     * @param {*} respHeaders 
     * @param {*} respBody 
     */
    function createServiceLog(serviceURL, soapAction, request, respCode, respHeaders, respBody){
        let functionName = "createServiceLog";
        let serviceLogRec = record.create({
            type: "customrecord_bsp_lb_service_logs",
        });

        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_url",
            value: serviceURL,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_soap_action",
            value: soapAction,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_request",
            value: request,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_response_code",
            value: respCode,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_response_header",
            value: respHeaders,
        });
        serviceLogRec.setValue({
            fieldId: "custrecord_bsp_lb_response_body",
            value: respBody,
        });

        let servicelogRecID = serviceLogRec.save();
        log.audit(functionName, "Service Log Created: " + servicelogRecID);  
    }

    /**
     * Create Error Log Record
     * @param {*} errorSource 
     * @param {*} errorMessage 
     * @param {*} errorDetail 
     */
    function createErrorLog(errorSource, errorMessage, errorDetail){
        let errorLogRec = record.create({
            type: "customrecord_bsp_lb_error_logs",
        });

        errorLogRec.setValue({
            fieldId: "custrecord_bsp_lb_error_source",
            value: errorSource,
        });
        errorLogRec.setValue({
            fieldId: "custrecord_bsp_lb_error_message",
            value: errorMessage,
        });
        errorLogRec.setValue({
            fieldId: "custrecord_bsp_lb_error_detail",
            value: errorDetail,
        });
        
        errorLogRec.save();
    }

    /**
     * Update Last Runtime Execution Date
     * @param {*} settingRecID 
     */
    function updateLastRuntimeExecution(settingRecID){
        let lastRuntimeExecutionDate = new Date().toISOString();
        record.submitFields({
            type: 'customrecord_bsp_lb_integration_settings',
            id: settingRecID,
            values: {
                custrecord_bsp_lb_last_runtime_exec: lastRuntimeExecutionDate
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields : true
            }
        });
    }

    /**
     * Create Inbound Queue for each Logicblock Order 
     * @param {*} queueId 
     * @param {*} jsonObject 
     * @returns 
    */
    function createInboundQueue(queueId, jsonObject){
        let objQueueReturn = {};
        let status = LOGICBLOCK_CONTANTS.errorStatus;
        let code = LOGICBLOCK_CONTANTS.errorCodeCreatingQueue;
        let message = LOGICBLOCK_CONTANTS.errorMessageCreatingQueue;
        try {

            if(!queueExists(queueId)){
                let queueRecord = record.create({
                    type: "customrecord_bsp_lb_inbound_queue",
                });
        
                queueRecord.setValue({
                    fieldId: "custrecord_bsp_lb_queue_id",
                    value: queueId,
                });
                
                queueRecord.setValue({
                    fieldId: "custrecord_bsp_lb_json_resp",
                    value: JSON.stringify(jsonObject),
                });
        
                let queueRecordId = queueRecord.save();
        
                status = LOGICBLOCK_CONTANTS.successStatus;
                message = queueRecordId;
            }else{
                message = `${LOGICBLOCK_CONTANTS.errorMessageQueueAlreadyExists} - Queue Id: ${queueId}`;
            }         
        }catch (error) {
            message = error.toString();
        }    
        
        objQueueReturn = {
            status: status,
            code: code,
            message: message,
            queueId: queueId
        };

        return objQueueReturn;
    }

    /**
     * Creates Mapping Key Record
     * @param {*} nsRecId 
     * @param {*} nsRecType 
     * @param {*} logicBlockId 
     * @param {*} logicBlockRecType 
     */
    function createMappingKeyRecord(nsRecId, nsRecType, logicBlockId, logicBlockRecType){
        let keyRec = record.create({
            type: "customrecord_bsp_lb_mapped_keys",
        });

        keyRec.setValue({
            fieldId: "custrecord_bsp_lb_netsuite_id",
            value: nsRecId,
        });
        keyRec.setValue({
            fieldId: "custrecord_bsp_lb_rec_type_ns",
            value: nsRecType,
        });
        keyRec.setValue({
            fieldId: "custrecord_bsp_lb_logicblock_id",
            value: logicBlockId,
        });
        keyRec.setValue({
            fieldId: "custrecord_bsp_lb_rec_type_lb",
            value: logicBlockRecType,
        });
        
        keyRec.save();
    }
    /**
     * Check if the Inbound Queue was already created on a previous execution
     * @param {*} queueId 
     * @returns 
     */
    function queueExists(queueId){
        let inboundQueueSearchObj = search.create({
            type: "customrecord_bsp_lb_inbound_queue",
            filters:
            [
                ["custrecord_bsp_lb_queue_id","is",queueId],
                "AND", 
                ["isinactive","is","F"]
            ],
            columns:[]
            });
            return (inboundQueueSearchObj.runPaged().count > 0);
    }


    /**
     * Get all Inbound Queue Records to be processed
     * @returns 
    */
    function getInboundQueues(){
        let inboundQueueSearchObj = search.create({
            type: "customrecord_bsp_lb_inbound_queue",
            filters:
            [
                ["isinactive","is","F"]
            ],
            columns:
            [
                search.createColumn({name: "custrecord_bsp_lb_queue_id", label: "Queue Id"}),
                search.createColumn({name: "custrecord_bsp_lb_json_resp", label: "JSON Response"})
            ]
        });

        return inboundQueueSearchObj;
    }

    /**
     * Return Mapping Fields configured in the NS account
     * @param {*} recordType 
     * @param {*} hasAddressSubRecord 
     * @returns 
     */
     function getMappingFields(recordType, hasAddressSubRecord){
        let objFieldMapper = {};
        let bodyFields = [];
        let lineFields = [];
        let searchFilters = [];

        searchFilters.push(
            search.createFilter({
                name: "isinactive",
                operator: search.Operator.IS,
                values: false,
            })
        );

        searchFilters.push(
            search.createFilter({
                name: "name",
                operator: search.Operator.IS,
                values: recordType,
            })
        );

        if(hasAddressSubRecord){
            searchFilters.push('OR', ['name', 'is', "Billing Address"]);
            searchFilters.push('OR', ['name', 'is', "Shipping  Address"]);
        }

        const objRecMapperSearch = search.create({
            type: "customrecord_bsp_lb_rec_mapper",
            filters: searchFilters,
            columns: [
                { name: "name", sort: search.Sort.ASC },
                { name: "custrecord_bsp_lb_ns_field_id" },
                { name: "custrecord_bsp_lb_ns_sublist_field" },
                { name: "custrecord_bsp_lb_src_field_id" },
                { name: "custrecord_bsp_lb_src_sublist_field_id" },
                { name: "custrecord_bsp_lb_is_line_item" },
                { name: "custrecord_bsp_lb_ns_default_value" },
                { name: "custrecord_bsp_lb_data_type" },
                { name: "custrecord_bsp_lb_search_filter" },
                { name: "custrecord_bsp_lb_search_record" },
                { name: "custrecord_bsp_lb_search_column" },
                { name: "custrecord_bsp_lb_search_operator" },
                { name: "custrecord_bsp_lb_set_value" }
            ],
        });

        objRecMapperSearch.run().each(function (result) {

            let lineValue = result.getValue({
                name: "custrecord_bsp_lb_is_line_item",
            });

            bodyFields.push({
                isLineItem: lineValue,
                netSuiteFieldName: result.getValue({
                    name: "name",
                }),
                netSuiteFieldId: result.getValue({
                    name: "custrecord_bsp_lb_ns_field_id",
                }),
                lbFieldId: result.getValue({
                    name: "custrecord_bsp_lb_src_field_id",
                }),
                lbFieldDataType: result.getValue({
                    name: "custrecord_bsp_lb_data_type",
                }),
                lbFieldSearchFilter: result.getValue({
                    name: "custrecord_bsp_lb_search_filter",
                }),
                lbFieldSearchRecord: result.getValue({
                    name: "custrecord_bsp_lb_search_record",
                }),
                lbFieldSearchColumn: result.getValue({
                    name: "custrecord_bsp_lb_search_column",
                }),
                lbFieldSearchOperator: result.getValue({
                    name: "custrecord_bsp_lb_search_operator",
                }),
                defaultValue: result.getValue({
                    name: "custrecord_bsp_lb_ns_default_value",
                }),
                isSetValue: result.getValue({
                    name: "custrecord_bsp_lb_set_value",
                })
            });

            if (lineValue == true || lineValue == "T") {
                lineFields.push({
                    isLineItem: lineValue,
                    sublistId: result.getValue({
                        name: "custrecord_bsp_lb_ns_sublist_field",
                    }),
                    netsuiteFieldId: result.getValue({
                        name: "custrecord_bsp_lb_ns_field_id",
                    }),
                    lbFieldId: result.getValue({
                        name: "custrecord_bsp_lb_src_field_id",
                    }),
                    lbSublistId: result.getValue({
                        name: "custrecord_bsp_lb_src_sublist_field_id",
                    }),
                    lbFieldDataType: result.getValue({
                        name: "custrecord_bsp_lb_data_type",
                    }),
                    lbFieldSearchFilter: result.getValue({
                        name: "custrecord_bsp_lb_search_filter",
                    }),
                    lbFieldSearchRecord: result.getValue({
                        name: "custrecord_bsp_lb_search_record",
                    }),
                    lbFieldSearchColumn: result.getValue({
                        name: "custrecord_bsp_lb_search_column",
                    }),
                    lbFieldSearchOperator: result.getValue({
                        name: "custrecord_bsp_lb_search_operator",
                    }),
                    isSetValue: result.getValue({
                        name: "custrecord_bsp_lb_set_value",
                    }),
                    defaultValue: result.getValue({
                            name: "custrecord_bsp_lb_ns_default_value",
                    })
                });
            }
            return true;
        });

        objFieldMapper = {
            recordType: recordType,
            bodyFields: bodyFields,
            lineFields: lineFields,
        };

        return objFieldMapper;

     }

    /**
    * Build Error Details 
    * @param {*} objErrorDetail 
    * @returns 
    */
    function buildErrorDetails(objErrorDetail){
        return (~(objErrorDetail.error).indexOf(LOGICBLOCK_CONTANTS.errorMessageQueueAlreadyExists)) ? JSON.stringify({error:objErrorDetail.error}) : JSON.stringify(objErrorDetail);
    }
    
    /**
     * Converts XML to JSON
     * @param {*} xmlNode 
     * @returns 
     */
    function xmlToJson(xmlNode) {
        let obj = Object.create(null);

        if (xmlNode.nodeType == xmlMod.NodeType.ELEMENT_NODE) { // element
            if (xmlNode.hasAttributes()) {
                obj['@attributes'] = Object.create(null);
                for (let j in xmlNode.attributes) {
                    if(xmlNode.hasAttribute({name : j})){
                        obj['@attributes'][j] = xmlNode.getAttribute({
                            name : j
                        });
                    }
                }
            }
        } else if (xmlNode.nodeType == xmlMod.NodeType.TEXT_NODE) {
            obj = xmlNode.nodeValue;
        }

        if (xmlNode.hasChildNodes()) {
            for (let i = 0, childLen = xmlNode.childNodes.length; i < childLen; i++) {
                let childItem = xmlNode.childNodes[i];
                let nodeName = childItem.nodeName;
                if (nodeName in obj) {
                    if (!Array.isArray(obj[nodeName])) {
                        obj[nodeName] = [
                            obj[nodeName]
                        ];
                    }
                    obj[nodeName].push(xmlToJson(childItem));
                } else {
                    obj[nodeName] = xmlToJson(childItem);
                }
            }
        }

        return obj;
    }

    /**
     * Narrow down the JSON converted object to retrieve the Order list
     * @param {*} jsonObj 
     * @returns 
     */
    function getVendorsAttributeFromJSON(jsonObj){
        return jsonObj["s:Body"].FindAllVendorsResponse.FindAllVendorsResult;
    }

    /**
     * Narrow down the JSON converted object to retrieve the Vendor list
     * @param {*} jsonObj 
     * @returns 
    */
    function getOrdersAttributeFromJSON(jsonObj){
        return jsonObj["s:Body"].GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult["a:List"];
    }

    /**
     * Narrow down the JSON converted object to retrieve the Total Orders number
     * @param {*} jsonObj 
     * @returns 
    */
    function getTotalOrdersAttributeFromJSON(jsonObj){
        return (jsonObj["s:Body"].GetOrdersByCriteriaResponse.GetOrdersByCriteriaResult["a:TotalRows"])["#text"];
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

    return {
        serverConstants: serverConstants,
        constants: constants,
        recTypes: recTypes,
        isEmpty:isEmpty,
        getProp: getProp,
        xmlToJson:xmlToJson,
        getOrdersAttributeFromJSON: getOrdersAttributeFromJSON,
        getVendorsAttributeFromJSON: getVendorsAttributeFromJSON,
        getTotalOrdersAttributeFromJSON: getTotalOrdersAttributeFromJSON,
        getIntegrationSettings: getIntegrationSettings,
        createServiceLog: createServiceLog,
        createErrorLog: createErrorLog,
        createMappingKeyRecord: createMappingKeyRecord,
        updateLastRuntimeExecution: updateLastRuntimeExecution,
        createInboundQueue: createInboundQueue,
        buildErrorDetails: buildErrorDetails,
        getInboundQueues: getInboundQueues,
        getMappingFields: getMappingFields,
        getRecordInternalID: getRecordInternalID
	};
});
