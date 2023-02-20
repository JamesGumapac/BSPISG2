/**
 * @NApiVersion 2.1
 */
define(["N/record"],

    function (record) {
        /**
         * Create API service logs.
         * @param responseOptions
         */
        function eliteExtracreateServiceLog(responseOptions) {
            try {

                let functionName = "createServiceLog";
                let serviceLogRec = record.create({
                    type: "customrecord_bsp_isg_lb_service_logs",
                });

                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_url",
                    value: responseOptions.serviceURL,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_soap_action",
                    value: responseOptions.soapAction,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_request",
                    value: responseOptions.orderXML,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_code",
                    value: responseOptions.responseCode,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_header",
                    value: responseOptions.responseHeader,
                });
                serviceLogRec.setValue({
                    fieldId: "custrecord_bsp_lb_response_body",
                    value: responseOptions.responseBody,
                });

                let servicelogRecID = serviceLogRec.save();
                log.audit(functionName, "Service Log Created: " + servicelogRecID + " - soapAction: " + responseOptions.soapAction);
            } catch (e) {
                log.error("eliteExtracreateServiceLog", e.message)


            }
        }



        return {
            eliteExtracreateServiceLog: eliteExtracreateServiceLog,
        }
    });
