/**
 * @NApiVersion 2.1
 */
define(["N/https", "./bsp_isg_elite_extra_create_service_log.js"], /**
 *
 */ function (https, BSPEliteServiceLogs) {
  /**
   *
   * @param options
   * @returns {ClientResponse}
   */
  function uploadOrder(options) {
    try {
      let recTitle = options.recType === "I" ? "IF" : "RMA";

      const soapAction = "POST";
      let serviceURL = options.eliteExtraSettings.endpointURL + "/upload_order";
      const headers = {};
      headers["Content-Type"] = "text/xml";
      headers["X-Name"] = `${recTitle}${options.recId}.xml`;
      headers["Authorization"] =
          "Basic " + options.eliteExtraSettings.authorization;
      let orderXML = options.orderXML.replace(/[\r\n]/g, "");

      const eliteExtraResponse = https.post({
        method: https.Method.POST,
        url: serviceURL,
        body: orderXML,
        headers: headers,
      });

      log.debug("eliteExtraResponse", eliteExtraResponse)
      let responseOptions = {
        serviceURL: serviceURL,
        soapAction: soapAction,
        orderXML: orderXML,
        responseCode: eliteExtraResponse.code,
        responseHeader: JSON.stringify(eliteExtraResponse.headers),
        responseBody: eliteExtraResponse.body.substring(0, 100000)
      }
      BSPEliteServiceLogs.eliteExtracreateServiceLog(
          responseOptions
      );

      return eliteExtraResponse;
    } catch (e) {
      log.error("uploadOrder", e.message);
    }
  }

  return {
    uploadOrder: uploadOrder,
  };
});
