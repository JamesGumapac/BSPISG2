/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search", "N/https", "./xmlTojson.js","N/xml"]
/**
 * @param{record} record
 * @param{search} search
 */, (record, search,https,xmlToJson,xml) => {
  
  /**
   * Get the trading partner Settings
   * @param tradingPartnerId
   * @returns {*[]}
   */
  function getTPSettings(tradingPartnerId) {
    try {
      let tpItemAvailabilitySettings = [];
      const tradingPartnerRec = record.load({
        type: "customrecord_bsp_isg_trading_partner",
        id: tradingPartnerId,
        isDynamic: true,
      });
      tpItemAvailabilitySettings.push({
        tpUser: tradingPartnerRec.getValue("custrecord_bsp_isg_tp_user"),
        tpPassword: tradingPartnerRec.getValue(
          "custrecord_bsp_isg_tb_password"
        ),
        tpEndpoint: tradingPartnerRec.getValue(
          "custrecord_bsp_isg_ia_enpoint_url"
        ),
        tpSoapAction: tradingPartnerRec.getValue(
          "custrecord_bsp_isg_soap_action"
        ),
        tpAccountNumber: tradingPartnerRec.getValue(
          "custrecord_bsp_isg_tp_group_code"
        ),
        isShowOutOfStock: tradingPartnerRec.getValue(
          "custrecord_bsp_isg_show_out_of_stock"
        ),
      });

      return tpItemAvailabilitySettings;
    } catch (e) {
      log.error("getTPSettings", e.message);
    }
  }

  /**
   * Generate a readable item availability objet
   * @returns {{quantity: number, locationId, description: string, restockDate: string}}
   * @param itemAvailabilityList
   */
  function generateItemAvailabilityObj(itemAvailabilityList) {
    const locationId = itemAvailabilityList["us:IDs"]["oa:ID"];
    const quantity = parseInt(itemAvailabilityList["us:Quantity"]);
    let description = "Available";
    let restockDate = "Unavailable";
    let itemInfo = Object.create(null);
    itemInfo = { ...itemAvailabilityList };
    if (quantity === 0) {
      description = itemInfo["oa:Status"]["oa:Description"];
      if (description.includes("Out of Stock")) {
        restockDate = itemAvailabilityList["us:ETADateTime"];
      }
    }

    return {
      locationId: locationId,
      quantity: quantity,
      description: description,
      restockDate: restockDate,
    };
  }

  /**
   * Get all of the trading partner accounts
   * @param tradingPartnerId
   * @returns {*[]}
   */
  function getAllTpAccount(tradingPartnerId) {
    try {
      let returnedAccountNumber = [];
      const tpAccountNumberSearch = search.create({
        type: "customrecord_bsp_isg_account_number",
        filters: [
          [
            "custrecord_bsp_isg_parent_trading_partn",
            "anyof",
            tradingPartnerId,
          ],
        ],
        columns: [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name",
          }),
        ],
      });

      if (tpAccountNumberSearch.runPaged().count === 0) return;
      tpAccountNumberSearch.run().each(function (result) {
        returnedAccountNumber.push({
          accountNumber: result.getValue({
            name: "name",
          }),
        });

        return true;
      });
      return returnedAccountNumber;
    } catch (e) {
      log.error("getAllTpAccount", e.message);
    }
  }

  /**
   * This function get the itemAvaibilityList from Essendant
   * @param tpItemAvailabilitySettings
   * @param itemId
   * @param accountNumber
   */
  function getItemAvailabilityList(
    tpItemAvailabilitySettings,
    itemId,
    accountNumber
  ) {
    try {
      const itemNameSearch = search.lookupFields({
        type: search.Type.ITEM,
        id: itemId,
        columns: ["itemid"],
      });
      let itemName = itemNameSearch["itemid"];

      const date = createDate();
      //body Request
      const requestBodyXML = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:prod="http://wsdl.ussco.com/ProductAvailabilityInterface" xmlns:us="http://www.ussco.com/oagis/0" xmlns:oa="http://www.openapplications.org/oagis/9">
    <soapenv:Header>
      <wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
         <wsse:UsernameToken wsu:Id="UsernameToken-21985926" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
            <wsse:Username>${tpItemAvailabilitySettings[0].tpUser}</wsse:Username>
            <wsse:Password>${tpItemAvailabilitySettings[0].tpPassword}</wsse:Password>
         </wsse:UsernameToken>
      </wsse:Security>
   </soapenv:Header>
    <soapenv:Body>
        <prod:getProductAvailability>
            <GetProductAvailability releaseID="1.0">
                <us:ApplicationArea>
                    <oa:CreationDateTime>${date}</oa:CreationDateTime>
                    <oa:BODID>00001</oa:BODID>
                </us:ApplicationArea>
                <us:DataArea>
                    <oa:Get>
                        <oa:Expression/>
                    </oa:Get>
                    <us:ProductAvailability>
                        <us:Item>
                            <oa:ItemID>
                                <oa:ID>${itemName}</oa:ID>
                            </oa:ItemID>
                        </us:Item>
                        <oa:ShipToParty>
                            <oa:PartyIDs>
                                <oa:ID>${accountNumber}</oa:ID>
                            </oa:PartyIDs>
                        </oa:ShipToParty>
                        <us:ADOTCode>N</us:ADOTCode>
                    </us:ProductAvailability>
                </us:DataArea>
            </GetProductAvailability>
        </prod:getProductAvailability>
    </soapenv:Body>
</soapenv:Envelope>`;
      let essendantResponse = https.request({
        method: https.Method.POST,
        url: tpItemAvailabilitySettings[0].tpEndpoint,
        body: requestBodyXML,
        headers: {
          "Content-Type": "text/xml",
          SOAPAction: tpItemAvailabilitySettings[0].tpSoapAction,
        },
      });
      let xmlDocument = xml.Parser.fromString({
        text: essendantResponse.body,
      });
      let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement);
      log.debug("essendantResponse " ,resBody);
      const returnMessage =
        resBody["soapenv:Body"]["in:getProductAvailabilityResponse"][
          "ShowProductAvailability"
        ]["us:DataArea"]["us:ProductAvailability"]["oa:Status"][
          "oa:Description"
        ];

      let itemAvailabilityListObj = [];
      let itemAvailabilityList;
      itemAvailabilityList =
        resBody["soapenv:Body"]["in:getProductAvailabilityResponse"][
          "ShowProductAvailability"
        ]["us:DataArea"]["us:ProductAvailability"]["us:Facility"];
      itemAvailabilityList.forEach(function (itemAvailability) {
        itemAvailabilityListObj.push(
          generateItemAvailabilityObj(itemAvailability)
        );
      });
      let returnObject = [];
      returnObject.push({
        returnMessage: returnMessage,
        itemName: itemName,
        itemAvailabilityList: itemAvailabilityListObj,
      });
      return returnObject;
    } catch (e) {
      log.error("getItemAvailabilityList", e.message);
    }
  }

  /**
   * create date
   * @returns {string}
   */
  function createDate() {
    let today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    const yyyy = today.getFullYear();

    return (today = yyyy + "-" + mm + "-" + dd);
  }

  /**
   * This function check if string is empty
   * @param stValue
   * @returns {boolean}
   */
  function isEmpty(stValue) {
    return (stValue === "" ||
        stValue == null || false || (stValue.constructor === Array && stValue.length === 0) || (stValue.constructor === Object &&
            (function (v) {
              for (let k in v) return false;
              return true;
            })(stValue)));
  }

  return {
    getTPSettings: getTPSettings,
    getItemAvailabilityList: getItemAvailabilityList,
    getAllTpAccount: getAllTpAccount,
    isEmpty: isEmpty,
  };
});
