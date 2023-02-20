/**
 * @NApiVersion 2.1
 */
define(["N/record"],

    function (record) {
        /**
         * Create API service logs.
         * @param {string} options.serviceURL Where the request is sent
         * @param {string} options.soapAction SOAP Action used
         * @param {string} options.orderXML Body request
         * @param {int} options.responseCode Returned Response Code
         * @param {string} options.responseHeader Returned header
         * @param {string} options.responseBody Returned body
         */
        function eliteExtracreateServiceLog(options) {
            try {

                let functionName = "createServiceLog";
                let serviceLogRec = record.create({
                    type: "customrecord_bsp_isg_lb_service_logs",
                });

                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_url",
                    value: options.serviceURL,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_soap_action",
                    value: options.soapAction,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_request",
                    value: options.orderXML,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_code",
                    value: options.responseCode,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_header",
                    value: options.responseHeader,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_body",
                    value: options.responseBody,
                });

                let servicelogRecID = serviceLogRec.save();
                log.audit(functionName, "Service Log Created: " + servicelogRecID + " - soapAction: " + options.soapAction);
            } catch (e) {
                log.error("eliteExtracreateServiceLog", e.message)


            }
        }


        return {
            eliteExtracreateServiceLog: eliteExtracreateServiceLog,
        }
    });
