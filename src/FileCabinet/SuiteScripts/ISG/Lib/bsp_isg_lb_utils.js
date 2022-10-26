/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define([
  "N/search",
  "N/record",
  "./Third Parties/lodash.min.js",
  "N/task",
  "N/format",
], function (search, record, lodash, task, format) {
  const API_CONSTANTS = Object.freeze({
    startIndex: 0,
    successCode: 200,
  });

  const LOGICBLOCK_CONTANTS = Object.freeze({
    successStatus: "SUCCESS",
    errorStatus: "ERROR",
    errorCodeCreatingQueue: "ERROR_CREATING_QUEUE",
    errorMessageCreatingQueue: "An error has occurred creating Queue record.",
    errorMessageQueueAlreadyExists: "The Queue record already exists.",
    mrCreateRecordsScriptId: "customscript_bsp_isg_lb_mr_create_recs",
    mrCreateRecordsDeploymentId: "customdeploy_bsp_lb_mr_create_ns_records",
    errorCapturePayment:
      "An error occured while try to Capture Logicblock payment",
    transactionTypeField: "ntype",
    itemFulfillmentShipStatus: "shipstatus",
    shipstatus: "C",
    defaultInventoryLocation: 3,
    defaultQuantityOnHand: 99999,
    statusPaid: "Paid",
    transactionTypeIF: 32,
    transactionTypeInv: 7,
    transactionTypePayment: 9,
    creditCard: "Credit Card",
    purchaseOrder: "Purchase Order",
    excludeFromTransmission: 3,
  });

  const OUTBOUND_QUEUE_OPERATIONS = Object.freeze({
    shipPackage: 1,
    processPayment: 2,
    sendInvoice: 3,
  });

  const REC_TYPES = Object.freeze({
    customer: "Customer",
    salesOrder: "Sales Order",
    cashSale: "Cash Sale",
    purchaseOrder: "Purchase Order",
    vendor: "Vendor",
    item: "Item",
    payment: "Payment",
    billingAddress: "Billing Address",
    shippingAddress: "Shipping Address",
    itemFulfillment: "itemfulfillment",
    invoice: "invoice",
    customerPayment: "customerpayment",
  });

  const SHIPMENT_TYPE = ({
    dropship: 1,
    wrapAndLabel: 2,
  });

  /**
   * Returns Integration server constants
   * @returns
   */
  function serverConstants() {
    return API_CONSTANTS;
  }

  /**
   * Returns Integration Project Constants
   * @returns
   */
  function constants() {
    return LOGICBLOCK_CONTANTS;
  }

  /**
   * Returns Rec Types
   * @returns
   */
  function recTypes() {
    return REC_TYPES;
  }

  /**
   * Returns Outbound Queue Operations
   * @returns
   */
  function outboundQueueOperations() {
    return OUTBOUND_QUEUE_OPERATIONS;
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
   * Returns Logicblock ID mapped in NS
   * @param {*} nsID
   * @returns
   */
  function getLogicblockID(nsID) {
    let logicblockId = null;
    if (nsID) {
      const mappingKeysSearchObj = search.create({
        type: "customrecord_bsp_isg_lb_mapped_keys",
        filters: [["custrecord_bsp_lb_netsuite_id", "is", nsID]],
        columns: [
          search.createColumn({
            name: "custrecord_bsp_lb_logicblock_id",
            label: "Logicblock ID",
          }),
        ],
      });
      let mappingKeysSearchResultCount = mappingKeysSearchObj.runPaged().count;
      if (mappingKeysSearchResultCount > 0) {
        mappingKeysSearchObj.run().each(function (result) {
          logicblockId = result.getValue({
            name: "custrecord_bsp_lb_logicblock_id",
          });
          return true;
        });
      }
    }
    return logicblockId;
  }

  /**
   * Returns NS Internal ID if exists in NS
   * @param {*} logicblockID
   * @returns
   */
  function getRecordInternalID(logicblockID) {
    let netSuiteRecId = null;
    if (logicblockID) {
      const mappingKeysSearchObj = search.create({
        type: "customrecord_bsp_isg_lb_mapped_keys",
        filters: [["custrecord_bsp_lb_logicblock_id", "is", logicblockID]],
        columns: [
          search.createColumn({
            name: "custrecord_bsp_lb_netsuite_id",
            label: "Internal NetSuite ID",
          }),
        ],
      });
      let mappingKeysSearchResultCount = mappingKeysSearchObj.runPaged().count;
      if (mappingKeysSearchResultCount > 0) {
        mappingKeysSearchObj.run().each(function (result) {
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
      type: "customrecord_bsp_isg_lb_integ_settings",
      id: settingRecID,
      columns: [
        "custrecord_bsp_lb_orders_service_url",
        "custrecord_bsp_lb_catalog_service_url",
        "custrecord_bsp_lb_get_orders_soap_action",
        "custrecord_bsp_lb_login_soap_action",
        "custrecord_bsp_lb_get_vend_soap_action",
        "custrecord_bsp_lb_get_prod_soap_action",
        "custrecord_bsp_lb_create_pkg_soap_action",
        "custrecord_bsp_lb_ship_pkg_soap_action",
        "custrecord_bsp_lb_get_pymnts_soap_action",
        "custrecord_bsp_lb_capt_pymnt_soap_action",
        "custrecord_bsp_lb_po_payment_soap_action",
        "custrecord_bsp_lb_user_id",
        "custrecord_bsp_lb_password",
        "custrecord_bsp_lb_last_runtime_exec",
        "custrecord_bsp_lb_orders_page_size",
        "custrecord_bsp_lb_exclude_canceled_ord",
        "custrecord_bsp_lb_sales_order_form",
        "custrecord_bsp_lb_cash_sale_form",
        "custrecord_bsp_lb_undep_founds",
        "custrecord_bsp_lb_account",
        "custrecord_bsp_lb_default_location_trans",
        "custrecord_bsp_lb_default_route_code",
        "custrecord_bsp_lb_avatax",
        "custrecord_bsp_isg_taxable"
      ],
    });

    return settings;
  }

  /**
   * Return Logicblock Integration settings - filter by Order Status field
   * @param {*} settingRecID
   * @returns
   */
  function getOrderStatusFilter(settingRecID) {
    let settings = search.lookupFields({
      type: "customrecord_bsp_isg_lb_integ_settings",
      id: settingRecID,
      columns: ["custrecord_bsp_lb_filter_by_order_status"],
    });

    let orderStatuses = null;
    if (settings && settings.custrecord_bsp_lb_filter_by_order_status) {
      let orderStatusesField =
        settings.custrecord_bsp_lb_filter_by_order_status;
      orderStatuses = orderStatusesField.map((status) => {
        return status.text;
      });
    }

    return orderStatuses;
  }

  /**
   * Update Retry count on Inbound Queue
   * @param {*} inboundQueueRecId
   */
  function updateInboundQueueRetryCount(inboundQueueRecId) {
    let retryCount = search.lookupFields({
      type: "customrecord_bsp_isg_lb_inbound_queue",
      id: inboundQueueRecId,
      columns: "custrecord_bsp_lb_retry_count",
    }).custrecord_bsp_lb_retry_count;

    retryCount = retryCount ? retryCount : 0;
    retryCount++;

    record.submitFields({
      type: "customrecord_bsp_isg_lb_inbound_queue",
      id: inboundQueueRecId,
      values: {
        custrecord_bsp_lb_retry_count: retryCount,
      },
    });
  }

  /**
   * Update Retry count on Outbound Queue
   * @param {*} outboundQueueRecId
   */
  function updateOutboundQueueRetryCount(outboundQueueRecId) {
    let retryCount = search.lookupFields({
      type: "customrecord_bsp_isg_lb_outbound_queue",
      id: outboundQueueRecId,
      columns: "custrecord_bsp_lb_outbound_retry_count",
    }).custrecord_bsp_lb_outbound_retry_count;

    retryCount = retryCount ? retryCount : 0;
    retryCount++;

    record.submitFields({
      type: "customrecord_bsp_isg_lb_outbound_queue",
      id: outboundQueueRecId,
      values: {
        custrecord_bsp_lb_outbound_retry_count: retryCount,
      },
    });
  }

  /**
   * Create Service Log Record with each API call
   * @param {*} serviceURL
   * @param {*} soapAction
   * @param {*} request
   * @param {*} respCode
   * @param {*} respHeaders
   * @param {*} respBody
   */
  function createServiceLog(
    serviceURL,
    soapAction,
    request,
    respCode,
    respHeaders,
    respBody
  ) {
    let functionName = "createServiceLog";
    let serviceLogRec = record.create({
      type: "customrecord_bsp_isg_lb_service_logs",
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
    log.audit(
      functionName,
      "Service Log Created: " + servicelogRecID + " - soapAction: " + soapAction
    );
  }

  /**
   * Create Error Log Record
   * @param {*} errorSource
   * @param {*} errorMessage
   * @param {*} errorDetail
   */
  function createErrorLog(errorSource, errorMessage, errorDetail) {
    let errorLogRec = record.create({
      type: "customrecord_bsp_isg_lb_error_logs",
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
  function updateLastRuntimeExecution(settingRecID) {
    let date = new Date();
    date.setHours(date.getHours() - 5);
    let lastRuntimeExecutionDate = date.toISOString();

    record.submitFields({
      type: "customrecord_bsp_isg_lb_integ_settings",
      id: settingRecID,
      values: {
        custrecord_bsp_lb_last_runtime_exec: lastRuntimeExecutionDate,
      },
      options: {
        enableSourcing: false,
        ignoreMandatoryFields: true,
      },
    });
  }

  /**
   * Get Max Retry Count setUp for Logicblock Integration
   * @param {*} settingRecID
   * @returns
   */
  function getSettingsMaxRetryCount(settingRecID) {
    let maxRetryCount = null;

    let objSettingsField = search.lookupFields({
      type: "customrecord_bsp_isg_lb_integ_settings",
      id: settingRecID,
      columns: "custrecord_bsp_lb_max_retry_count",
    });

    if (
      objSettingsField &&
      objSettingsField.custrecord_bsp_lb_max_retry_count
    ) {
      maxRetryCount = objSettingsField.custrecord_bsp_lb_max_retry_count;
    }

    return maxRetryCount;
  }

  /**
   * Delete queues that had been processed
   * @param {*} settingRecID
   */
  function deleteProcessedInboundQueues(settingsRecID) {
    let maxRetryCount = getSettingsMaxRetryCount(settingsRecID);

    let inboundQueueSearchObj = search.create({
      type: "customrecord_bsp_isg_lb_inbound_queue",
      filters: [
        ["isinactive", "is", "F"],
        "AND",
        [
          ["custrecord_bsp_lb_retry_count", "equalto", maxRetryCount],
          "OR",
          ["custrecord_bsp_lb_inbound_q_processed", "is", "T"],
        ],
      ],
      columns: [],
    });
    let deletedQueues = 0;
    inboundQueueSearchObj.run().each(function (result) {
      record.delete({
        type: "customrecord_bsp_isg_lb_inbound_queue",
        id: result.id,
      });
      deletedQueues++;
      return true;
    });
    return deletedQueues;
  }

  /**
   * Delete Outbound queues that had been processed
   * @param {*} settingRecID
   * @param {*} operation
   */
  function deleteProcessedOutboundQueues(settingsRecID, operation) {
    let maxRetryCount = getSettingsMaxRetryCount(settingsRecID);

    let inboundQueueSearchObj = search.create({
      type: "customrecord_bsp_isg_lb_outbound_queue",
      filters: [
        ["isinactive", "is", "F"],
        "AND",
        [
          ["custrecord_bsp_lb_outbound_retry_count", "equalto", maxRetryCount],
          "OR",
          ["custrecord_bsp_lb_outbound_q_processed", "is", "T"],
        ],
        "AND",
        ["custrecord_bsp_lb_operation", "anyof", operation],
      ],
      columns: [],
    });
    let deletedQueues = 0;
    inboundQueueSearchObj.run().each(function (result) {
      record.delete({
        type: "customrecord_bsp_isg_lb_outbound_queue",
        id: result.id,
      });
      deletedQueues++;
      return true;
    });
    return deletedQueues;
  }

  /**
   * Marked Queue as Processed
   * @param {*} queueID
   * @param {*} queueType
   */
  function markQueueAsProcessed(queueID, queueType) {
    if (queueType == "customrecord_bsp_isg_lb_inbound_queue") {
      record.submitFields({
        type: queueType,
        id: queueID,
        values: {
          custrecord_bsp_lb_inbound_q_processed: true,
        },
      });
    } else {
      record.submitFields({
        type: queueType,
        id: queueID,
        values: {
          custrecord_bsp_lb_outbound_q_processed: true,
        },
      });
    }
  }

  /**
   * Create Inbound Queue for each Logicblock Order
   * @param {*} queueId
   * @param {*} jsonObject
   * @returns
   */
  function createInboundQueue(queueId, jsonObject) {
    let objQueueReturn = {};
    let status = LOGICBLOCK_CONTANTS.errorStatus;
    let code = LOGICBLOCK_CONTANTS.errorCodeCreatingQueue;
    let message = LOGICBLOCK_CONTANTS.errorMessageCreatingQueue;
    try {
      let queueType = "customrecord_bsp_isg_lb_inbound_queue";
      let fieldId = "custrecord_bsp_lb_queue_id";
      if (!queueExists(queueId, queueType, fieldId, null)) {
        let queueRecord = record.create({
          type: queueType,
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
      } else {
        message = `${LOGICBLOCK_CONTANTS.errorMessageQueueAlreadyExists} - Queue Id: ${queueId}`;
      }
    } catch (error) {
      message = error.toString();
    }

    objQueueReturn = {
      status: status,
      code: code,
      message: message,
      queueId: queueId,
    };

    return objQueueReturn;
  }

  /**
   * Create Outbound Queue for each NetSuite IF to be processed
   * @param {*} recID
   * @param {*} recType
   * @param {*} operation
   * @returns
   */
  function createOutboundQueue(recID, recType, operation) {
    let queueType = "customrecord_bsp_isg_lb_outbound_queue";
    let fieldId = "custrecord_bsp_lb_transaction";
    if (!queueExists(recID, queueType, fieldId, operation)) {
      let queueRecord = record.create({
        type: queueType,
      });

      queueRecord.setValue({
        fieldId: "custrecord_bsp_lb_transaction",
        value: recID,
      });
      queueRecord.setValue({
        fieldId: "custrecord_bsp_lb_transaction_type",
        value: recType,
      });
      queueRecord.setValue({
        fieldId: "custrecord_bsp_lb_operation",
        value: operation,
      });

      queueRecord.save();
      log.debug("createOutboundQueue", "Outbound Queue Created");
    }
  }

  /**
   * Creates Mapping Key Record
   * @param {*} nsRecId
   * @param {*} nsRecType
   * @param {*} logicBlockId
   * @param {*} logicBlockRecType
   */
  function createMappingKeyRecord(
    nsRecId,
    nsRecType,
    logicBlockId,
    logicBlockRecType
  ) {
    let keyRec = record.create({
      type: "customrecord_bsp_isg_lb_mapped_keys",
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
   * @param {*} queueType
   * @param {*} fieldId
   * @param {*} operation
   * @returns
   */
  function queueExists(queueId, queueType, fieldId, operation) {
    let inboundQueueSearchObj = null;
    if (queueType == "customrecord_bsp_isg_lb_outbound_queue") {
      inboundQueueSearchObj = search.create({
        type: queueType,
        filters: [
          [fieldId, "is", queueId],
          "AND",
          ["custrecord_bsp_lb_operation", "anyof", operation],
          "AND",
          ["isinactive", "is", "F"],
        ],
        columns: [],
      });
    } else {
      inboundQueueSearchObj = search.create({
        type: queueType,
        filters: [[fieldId, "is", queueId], "AND", ["isinactive", "is", "F"]],
        columns: [],
      });
    }

    return inboundQueueSearchObj.runPaged().count > 0;
  }

  /**
   * Get all Inbound Queue Records to be processed
   * @returns
   */
  function getInboundQueues() {
    let inboundQueueSearchObj = search.create({
      type: "customrecord_bsp_isg_lb_inbound_queue",
      filters: [["isinactive", "is", "F"]],
      columns: [
        search.createColumn({
          name: "custrecord_bsp_lb_queue_id",
          label: "Queue Id",
        }),
        search.createColumn({
          name: "custrecord_bsp_lb_json_resp",
          label: "JSON Response",
        }),
      ],
    });

    return inboundQueueSearchObj;
  }

  /**
   * Get all Outbound Queue Records to be processed
   * @param {*} operation
   * @returns
   */
  function getOutboundQueues(operation) {
    let outboundQueueSearchObj = search.create({
      type: "customrecord_bsp_isg_lb_outbound_queue",
      filters: [
        ["isinactive", "is", "F"],
        "AND",
        ["custrecord_bsp_lb_operation", "anyof", operation],
      ],
      columns: [
        search.createColumn({
          name: "custrecord_bsp_lb_transaction",
          label: "Transaction ID",
        }),
        search.createColumn({
          name: "custrecord_bsp_lb_transaction_type",
          label: "Transaction Type",
        }),
        search.createColumn({ name: "created", label: "Date Created" }),
      ],
    });

    return outboundQueueSearchObj;
  }
  /**
   * Return Mapping Fields configured in the NS account
   * @param {*} recordType
   * @param {*} hasAddressSubRecord
   * @returns
   */
  function getMappingFields(recordType, hasAddressSubRecord) {
    let objFieldMapper = {};
    let bodyFields = [];
    let lineFields = [];
    let searchFilters = [];

    if (hasAddressSubRecord) {
      if (recordType == REC_TYPES.customer) {
        searchFilters = [
          ["isinactive", "is", "F"],
          "AND",
          [
            ["name", "is", recordType],
            "OR",
            ["name", "is", "Customer Address"],
          ],
        ];
      } else {
        searchFilters = [
          ["isinactive", "is", "F"],
          "AND",
          [
            ["name", "is", recordType],
            "OR",
            ["name", "is", "Billing Address"],
            "OR",
            ["name", "is", "Shipping Address"],
          ],
        ];
      }
    } else {
      searchFilters = [
        ["isinactive", "is", "F"],
        "AND",
        ["name", "is", recordType],
      ];
    }

    const objRecMapperSearch = search.create({
      type: "customrecord_bsp_isg_lb_rec_mapper",
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
        { name: "custrecord_bsp_lb_set_value" },
      ],
    });

    objRecMapperSearch.run().each(function (result) {
      let lineValue = result.getValue({
        name: "custrecord_bsp_lb_is_line_item",
      });

      if (lineValue == false || lineValue == "F") {
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
          }),
        });
      }

      if (lineValue == true || lineValue == "T") {
        lineFields.push({
          isLineItem: lineValue,
          sublistId: result.getValue({
            name: "custrecord_bsp_lb_ns_sublist_field",
          }),
          netSuiteFieldId: result.getValue({
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
          }),
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
   * Retrieve internalID of record mapped to LogicBlock ID
   * @param {*} lbValue
   * @param {*} searchFilter
   * @param {*} searchRecord
   * @param {*} searchColumn
   * @param {*} searchOperator
   * @returns
   */
  function searchRecordToGetInternalId(
    lbValue,
    searchFilter,
    searchRecord,
    searchColumn,
    searchOperator
  ) {
    let recordSearch = search.create({
      type: searchRecord,
      filters: [[searchFilter, searchOperator, lbValue]],
      columns: [search.createColumn({ name: searchColumn })],
    });

    let recordIdSearch = searchAll(recordSearch);

    return recordIdSearch.length > 0
      ? recordIdSearch[0].getValue(searchColumn)
      : "";
  }

  /**
   * Delete mapped key from NS
   * @param {*} orderID
   */
  function deleteMappedKey(orderID) {
    let searchRecord = "customrecord_bsp_isg_lb_mapped_keys";
    let searchFilter = "custrecord_bsp_lb_logicblock_id";
    let searchOperator = "is";
    let searchColumn = "internalid";
    let recID = searchRecordToGetInternalId(
      orderID,
      searchFilter,
      searchRecord,
      searchColumn,
      searchOperator
    );

    record.delete({
      type: searchRecord,
      id: recID,
    });
  }

  /**
   * Returns Logicblock Order Data storded in Sales Order
   * @param {*} salesOrderID
   * @returns
   */
  function logicBlockOrderData(salesOrderID) {
    if (salesOrderID) {
      let logicblockOrderFields = search.lookupFields({
        type: search.Type.SALES_ORDER,
        id: salesOrderID,
        columns: [
          "custbody_bsp_isg_lb_order_number",
          "custbody_bsp_isg_lb_payment_method",
          "custbody_bsp_isg_lb_purchase_order_num",
        ],
      });
      if (
        logicblockOrderFields &&
        logicblockOrderFields.custbody_bsp_isg_lb_order_number
      ) {
        return logicblockOrderFields;
      }
    }
    return null;
  }

  /**
   * Schedule MR Task
   * @param {*} scriptId
   * @param {*} deploymentId
   */
  function scheduleMRTask(scriptId, deploymentId) {
    let functionName = "scheduleMRTask";
    let objMRTask = task.create({
      taskType: task.TaskType.MAP_REDUCE,
      scriptId: scriptId,
      deploymentId: deploymentId,
    });
    let intTaskID = objMRTask.submit();
    log.audit(functionName, `MR Task submitted with ID: ${intTaskID}`);
  }

  /**
   * Return Formatted date to store in NS field
   * @param {*} nsDate
   * @returns
   */
  function convertResponseDateToNSDate(nsDate) {
    let month = new Date(nsDate).getUTCMonth() + 1;
    let day = new Date(nsDate).getUTCDate();
    let year = new Date(nsDate).getUTCFullYear();

    nsDate = format.parse({
      value: new Date(month + "/" + day + "/" + year),
      type: format.Type.DATE,
    });

    return nsDate;
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
   * Build Error Details
   * @param {*} objErrorDetail
   * @returns
   */
  function buildErrorDetails(objErrorDetail) {
    return ~objErrorDetail.error.indexOf(
      LOGICBLOCK_CONTANTS.errorMessageQueueAlreadyExists
    )
      ? JSON.stringify({ error: objErrorDetail.error })
      : JSON.stringify(objErrorDetail);
  }

  /**
   * Delete transaction Record
   * @param {*} recType
   * @param {*} recID
   */
  function deleteTransaction(recType, recID) {
    record.delete({
      type: recType,
      id: recID,
    });
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
    outboundQueueOperations: outboundQueueOperations,
    isEmpty: isEmpty,
    getProp: getProp,
    scheduleMRTask: scheduleMRTask,
    convertResponseDateToNSDate: convertResponseDateToNSDate,
    deleteTransaction: deleteTransaction,
    deleteMappedKey: deleteMappedKey,
    getIntegrationSettings: getIntegrationSettings,
    getOrderStatusFilter: getOrderStatusFilter,
    createServiceLog: createServiceLog,
    createErrorLog: createErrorLog,
    createMappingKeyRecord: createMappingKeyRecord,
    updateLastRuntimeExecution: updateLastRuntimeExecution,
    deleteProcessedInboundQueues: deleteProcessedInboundQueues,
    deleteProcessedOutboundQueues: deleteProcessedOutboundQueues,
    createInboundQueue: createInboundQueue,
    createOutboundQueue: createOutboundQueue,
    buildErrorDetails: buildErrorDetails,
    getInboundQueues: getInboundQueues,
    getOutboundQueues: getOutboundQueues,
    getMappingFields: getMappingFields,
    searchRecordToGetInternalId: searchRecordToGetInternalId,
    getRecordInternalID: getRecordInternalID,
    getLogicblockID: getLogicblockID,
    updateInboundQueueRetryCount: updateInboundQueueRetryCount,
    updateOutboundQueueRetryCount: updateOutboundQueueRetryCount,
    logicBlockOrderData: logicBlockOrderData,
    markQueueAsProcessed: markQueueAsProcessed,
    SHIPMENT_TYPE: SHIPMENT_TYPE,
  };
});
