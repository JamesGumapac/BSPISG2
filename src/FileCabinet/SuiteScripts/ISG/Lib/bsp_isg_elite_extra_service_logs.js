/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/record"],

function(record) {
    
    function pageInit(){

    }

    function eliteExtracreateServiceLog(serviceURL, soapAction, request, respCode, respHeaders, respBody){
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
        log.audit(functionName, "Service Log Created: " + servicelogRecID + " - soapAction: " + soapAction);
    }

    /**
     * Create Error Log Record
     * @param {*} errorSource
     * @param {*} errorMessage
     * @param {*} errorDetail
     */
    function createErrorLog(errorSource, errorMessage, errorDetail){
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

    return {
        pageInit: pageInit,
        eliteExtracreateServiceLog: eliteExtracreateServiceLog,
        createErrorLog: createErrorLog
    }
});
