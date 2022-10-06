/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/https",
  "N/record",
  "N/search",
  "N/ui/message",
  "N/xml",
  "./Lib/bsp_isg_elite_extra_create_order.js",
], function (https, record, search, message, xml, BSPExliteExtra) {
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


  function sendOrderDetails(ifId, eliteExtraId) {
    alert("Uploading Order. Please wait...");
    //load the elite extra settings
    const eliteExtraSettingsSearch = search.lookupFields({
      type: "customrecord_elite_extra_setting",
      id: eliteExtraId,
      columns: [
        "custrecord_bsp_isg_based64encoding",
        "custrecord_bsp_create_order_ep_url",
      ],
    });
    //Get SO and IF Information and store it to an object
    const orderObj = BSPExliteExtra.getIfDetails(ifId);
    console.log("orderObj " + JSON.stringify(orderObj));
    const headerFieldsInfo = [orderObj.orderHeaderFields];
    const lineItemInfo = orderObj.itemLineInfo;

    let lineItemXml = "";
    //Create line XML from Order Object Line info
    lineItemInfo.forEach(function (lineItem) {
      lineItemXml += `
                    <line>
                  <order_quantity>${lineItem.order_quantity}</order_quantity>
                  <ship_quantity>${lineItem.order_quantity}</ship_quantity>
                  <price>${lineItem.rate}</price>
                  <cost>${lineItem.amount}</cost>
                  <part>
                      <number>${lineItem.number}</number>
                      <description></description>
                  </part>
                  <weight></weight>
                  <length></length>
                  <width></width>
                  <height></height>
                  <integration_type></integration_type>
                  <uom></uom>
              </line>`;
    });
    //Map the Order Details into XML body
    let orderXML = `<?xml version="1.0"?>
<order id="${headerFieldsInfo[0][0].orderId}">
    <warehouse id="${headerFieldsInfo[0][0].warehouse}">
    </warehouse>
    <po>${headerFieldsInfo[0][0].po}</po>
    <ecommerce_id></ecommerce_id>
    <status>${headerFieldsInfo[0][0].status}</status>
    <type></type>
    <total>
      <price>${headerFieldsInfo[0][0].price}</price>
      <cost></cost>
      <tax></tax>
      <deposit></deposit>
    </total>
    <cash_on_delivery></cash_on_delivery>
    <pay_type></pay_type>
    <Held>false</Held>
    <transfer_order>false</transfer_order>
    <will_call></will_call>
    <nparts></nparts>
    <datetime>${headerFieldsInfo[0][0].dateTime}</datetime>
    <shiptime>${headerFieldsInfo[0][0].shipTime}</shiptime>
    <voidtime></voidtime>
    <priority_code></priority_code>
    <order_priority></order_priority>
    <locked_position></locked_position>
    <delivery_zone></delivery_zone>
    <comment>${headerFieldsInfo[0][0].comment} test</comment>
    <instruction></instruction>
    <ship_via>
      <name>${headerFieldsInfo[0][0].shipViaName}</name>
      <description></description>
    </ship_via>
    <generate>
      <datetime></datetime>
    </generate>
    <invoice>
      <number></number>
      <datetime></datetime>
    </invoice>
    <route>
      <number></number>
    </route>
    <manifest>
      <number></number>
    </manifest>
    <sales_person id="${headerFieldsInfo[0][0].salesPersonId}">
      <name>
        <first>${headerFieldsInfo[0][0].salesPersonName}</first>
        <last>${headerFieldsInfo[0][0].salesPersonLastname}</last>
      </name>
    </sales_person>
    <customer>
      <bill_to id="${headerFieldsInfo[0][0].billToId}">
        <name>${headerFieldsInfo[0][0].billToName}</name>
        <address>
          <line_1>${headerFieldsInfo[0][0].billAddressLine1}</line_1>
          <line_2>${headerFieldsInfo[0][0].billAddressLine2}</line_2>
          <line_3>${headerFieldsInfo[0][0].billAddressLine3}</line_3>
        </address>
        <city>${headerFieldsInfo[0][0].billCity}</city>
        <state>${headerFieldsInfo[0][0].billState}</state>
        <zip>${headerFieldsInfo[0][0].billZip}</zip>
        <first_name></first_name>
        <last_name></last_name>
        <phone>${headerFieldsInfo[0][0].billToPhone}</phone>
        <email></email>
        <zone></zone>
        <latitude></latitude>
        <longitude></longitude>
        <notes></notes>
      </bill_to>
      <ship_to id="${headerFieldsInfo[0][0].shipToId}">
        <name>${headerFieldsInfo[0][0].shipToName}</name>
        <address>
          <line_1>${headerFieldsInfo[0][0].shipAddressLine1}</line_1>
          <line_2>${headerFieldsInfo[0][0].shipAddressLine2}</line_2>
          <line_3>${headerFieldsInfo[0][0].shipAddressLine3}</line_3>
        </address>
        <city>${headerFieldsInfo[0][0].shipCity}</city>
        <state>${headerFieldsInfo[0][0].shipState}</state>
        <zip>${headerFieldsInfo[0][0].shipZip}</zip>
        <phone>${headerFieldsInfo[0][0].shipToPhone}</phone>
        <email></email>
        <zone></zone>
        <latitude></latitude>
        <longitude></longitude>
        <notes></notes>
      </ship_to>
    </customer>
    <detail>
  ${lineItemXml}
    </detail>
    <signature>
      <device_id></device_id>
    </signature>
    <integration_type></integration_type>
    <avoid_scheduled_runs>false</avoid_scheduled_runs>
    <avoid_saved_manifest>false</avoid_saved_manifest>
    <RequestedStart></RequestedStart>
    <RequestedEnd></RequestedEnd>
    <PickupRequestedStart></PickupRequestedStart>
    <PickupRequestedEnd></PickupRequestedEnd>
    <load_type>Framing</load_type>
    <phone_number></phone_number>
    <duration></duration>
</order>`;
  console.log('Order XML: ' , orderXML)
    const endPointURL =
      eliteExtraSettingsSearch["custrecord_bsp_create_order_ep_url"];

    const headers = {};
    headers["Content-Type"] = "text/xml";
    headers["X-Name"] = `IF${headerFieldsInfo[0][0].orderId}.xml`;
    headers["Authorization"] =
      "Basic " + eliteExtraSettingsSearch["custrecord_bsp_isg_based64encoding"];
   //Upload Order and return response to the user
    const response = BSPExliteExtra.uploadOrderAPI(
      endPointURL,
      headers,
      orderXML,
      ifId
    );

    showMessage(response);

  }

  function showMessage(response) {
    if (response[0].failed == false) {
      const infoMessage = message.create({
        title: "CONFIRMATION",
        message: "Orders has been uploaded successfully",
        type: message.Type.CONFIRMATION,
      });
      infoMessage.show();
    } else {
      const infoMessage = message.create({
        title: "FAILED",
        message: "Failed to upload order",
        type: message.Type.ERROR,
      });
      infoMessage.show();
    }
  }



  return {
    pageInit: pageInit,
    sendOrderDetails: sendOrderDetails,
  };
});
