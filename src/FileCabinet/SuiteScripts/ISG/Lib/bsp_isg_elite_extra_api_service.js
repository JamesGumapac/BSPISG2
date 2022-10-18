/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/search", "N/https", "./bsp_isg_elite_extra_service_logs.js"], /**
 *
 */
function (search, https, BSPEliteServiceLogs) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

  function runService(ifId, eliteExtraId, xml, eliteExtraSettings) {
    const soapAction = "POST";

    let serviceURL = eliteExtraSettings.endpointURL + "/upload_order";
    const headers = {};
    headers["Content-Type"] = "text/xml";
    headers["X-Name"] = `IF${ifId}.xml`;
    headers["Authorization"] = "Basic " + eliteExtraSettings.authorization;
    let orderXML = xml.replace(/[\r\n]/g, "");


    const eliteExtraResponse = uploadOrder(orderXML, headers, serviceURL);
    log.debug("eliteExtraResponse", eliteExtraResponse)
    BSPEliteServiceLogs.eliteExtracreateServiceLog(
        serviceURL,
        soapAction,
        orderXML,
        eliteExtraResponse.code,
        JSON.stringify(eliteExtraResponse.headers),
        eliteExtraResponse.body.substring(0, 100000)
    );
    return eliteExtraResponse


  }


  function uploadOrder(requestBodyXML, headers, serviceURL) {

    return https.request({
      method: https.Method.POST,
      url: serviceURL,
      body: requestBodyXML,
      headers: headers,
    });
  }

  return {
    pageInit: pageInit,
    runService: runService,
  };
});
