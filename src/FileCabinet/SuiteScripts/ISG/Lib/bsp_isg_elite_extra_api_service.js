/**
 * @NApiVersion 2.1
 */
define(["N/search", "N/https", "./bsp_isg_elite_extra_service_logs.js"], /**
 *
 */
function (search, https, BSPEliteServiceLogs) {

  function uploadOrder(ifId, eliteExtraId, xml, eliteExtraSettings) {
    const soapAction = "POST";

    let serviceURL = eliteExtraSettings.endpointURL + "/upload_order";
    const headers = {};
    headers["Content-Type"] = "text/xml";
    headers["X-Name"] = `IF${ifId}.xml`;
    headers["Authorization"] = "Basic " + eliteExtraSettings.authorization;
    let orderXML = xml.replace(/[\r\n]/g, "");


    const eliteExtraResponse = https.request({
      method: https.Method.POST,
      url: serviceURL,
      body: orderXML,
      headers: headers,
    });
    
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

  

  return {
    uploadOrder: uploadOrder,
  };
});
