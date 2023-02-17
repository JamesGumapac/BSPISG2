/**
 * @NApiVersion 2.1
 */
define(["N/https", "./bsp_isg_elite_extra_service_logs.js"], /**
 *
 */ function (https, BSPEliteServiceLogs) {
  /**
   *
   * @param options
   * @returns {eliteExtraResponse}
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

      const eliteExtraResponse = https.request({
        method: https.Method.POST,
        url: serviceURL,
        body: orderXML,
        headers: headers,
      });

      log.debug("eliteExtraResponse", eliteExtraResponse);
      BSPEliteServiceLogs.eliteExtracreateServiceLog(
          serviceURL,
          soapAction,
          orderXML,
          eliteExtraResponse.code,
          JSON.stringify(eliteExtraResponse.headers),
          eliteExtraResponse.body.substring(0, 100000)
      );
      return eliteExtraResponse;
    } catch (e) {
      log.debug("uploadOrder", e.message);
    }
  }

  return {
    uploadOrder: uploadOrder,
  };
});
