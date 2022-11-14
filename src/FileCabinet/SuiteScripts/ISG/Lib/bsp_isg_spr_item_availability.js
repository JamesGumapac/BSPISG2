/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search", "N/http", "./xmlTojson.js","N/xml"]
	/**
	 * @param{record} record
	 * @param{search} search
	 */, (record, search,http,xmlToJson,xml) => {
		
		/**
		 * This function get the item item availability list
		 * @param tradingPartnerId
		 * @param itemId
		 * @returns {*[]}
		 */
		function getSprItemAvailabilityList(tradingPartnerId, itemId) {
			try {
				let rtnMessage;
				let itemName;
				let tpSettings = getTPSettings(tradingPartnerId);
				const itemNameSearch = search.lookupFields({
					type: search.Type.ITEM,
					id: itemId,
					columns: ["itemid"],
				});
				itemName = itemNameSearch["itemid"];
			
				let showOutOfStock = "Y"
				if(tpSettings[0].isShowOutOfStock === true || tpSettings[0].isShowOutOfStock ==="T"){
					showOutOfStock = "N"
				}
				const headers = {};
				//headers
				headers["Content-Type"] = "text/xml;charset=UTF-8";
				headers["User-Agent-x"] = tpSettings[0].tpAccountNumber;
				headers["SOAPAction"] = tpSettings[0].tpSoapAction;
				headers["Connection"] = "keep-alive";
				//body Request
				const xmlStr = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                                xmlns:stoc="${tpSettings[0].tpSoapAction}">
                                <soapenv:Header/>
                                <soapenv:Body>
                                <stoc:StockCheck>
                                <input>
                                <GroupCode>${tpSettings[0].tpAccountNumber}</GroupCode>
                                <UserID>${tpSettings[0].tpUser}</UserID>
                                <Password>${tpSettings[0].tpPassword}</Password>
                                <Action>F</Action>
                                <CustNumber></CustNumber>
                                <DcNumber></DcNumber>
                                <ItemNumber>${itemName}</ItemNumber>
                                <SortBy>Y</SortBy>
                                <MinInFullPacks></MinInFullPacks>
                                <AvailableOnly>${showOutOfStock}</AvailableOnly>
                                </input>
                                </stoc:StockCheck>
                                </soapenv:Body>
                                </soapenv:Envelope>`;
				
				const res = http.post({
					url: tpSettings[0].tpEndpoint,
					headers: headers,
					body: xmlStr,
				});
				if (res.code == !200) return;
				let xmlDocument = xml.Parser.fromString({
					text: res.body,
				});
				
				let resBody = xmlToJson.xmlToJson(xmlDocument.documentElement);
				
				let returnStatus =
					resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnStatus;
				rtnMessage =
					resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"].RtnMessage;
				const itemAvaibilityList = [];
				const returnObj = [];
				if (returnStatus !== "0000") {
					returnObj.push({
						returnMessage: rtnMessage,
					});
				} else {
					resBody["SOAP-ENV:Body"]["ns1:StockCheckResponse"]["return"][
						"ResultsRows"
						].item.forEach((item) => itemAvaibilityList.push(item));
					
					returnObj.push({
						itemName: itemName,
						itemAvaibilityList: itemAvaibilityList,
					});
				}
				return returnObj;
			} catch (e) {
				log.error("getSprItemAvailabilityList", e.message);
			}
		}
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
		return {
			getSprItemAvailabilityList: getSprItemAvailabilityList
		};
	});
