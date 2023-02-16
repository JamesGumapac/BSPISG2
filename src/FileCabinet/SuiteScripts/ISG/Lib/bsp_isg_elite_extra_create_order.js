/**
 * @NApiVersion 2.x
 */
define([
	"N/record",
	"N/runtime",
	"N/search",
	"N/format",
	"./bsp_isg_elite_extra_api_service.js",
], /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{format} format,
 * @param{*} BSPEliteExtraAPIService
 */ function (record, runtime, search, format, BSPEliteExtraAPIService) {
	/**
	 * Get the record information and SO details and create an object with it that will be used in the XML request
	 * @param {*} id Can be IF or RMA ID
	 */
	function getOrderDetails(id) {
		try {
			// if loading the item fulfillment record failed the script will still load RMA rec using catch block instead
			let rec;
			let TYPE;
			try {
				rec = record.load({
					type: record.Type.ITEM_FULFILLMENT,
					id: id,
					isDynamic: true,
				});
				TYPE = "I";
				log.debug("Item Fulfillment");
			} catch (e) {
				rec = record.load({
					type: record.Type.RETURN_AUTHORIZATION,
					id: id,
					isDynamic: true,
				});
				TYPE = "P";
				log.debug("Return Authorization");
			}

			const soId = rec.getValue("createdfrom");
			const soRec = record.load({
				type: record.Type.SALES_ORDER,
				id: soId,
				isDynamic: true,
			});

			const salesRepId = soRec.getValue("salesrep");
			let salesRepInfo = "";
			if (!isEmpty(salesRepId)) {
				salesRepInfo = search.lookupFields({
					type: search.Type.EMPLOYEE,
					id: salesRepId,
					columns: ["firstname", "lastname"],
				});
			}

			const billSubRecord = soRec.getSubrecord({
				fieldId: "billingaddress",
			});

			const shipSubRecord = soRec.getSubrecord({
				fieldId: "shippingaddress",
			});

			const orderHeaderFields = [];
			orderHeaderFields.push({
				orderId: rec.getValue("tranid"),
				warehouse: "1", //soRec.getValue("location"),
				po: soRec.getValue("otherrefnum") || "",
				status: "",
				price: "",
				type: TYPE, //if type is I item fulfillment if type is P returns
				tax: soRec.getValue("tax") || 0,
				deposit: soRec.getValue("custbody_bsp_aab_so_deposit") || 0,
				dateTime: formatDateTime(soRec.getValue("trandate")) || "",
				shipTime: formatDateTime(rec.getValue("trandate")) || "",
				comment: soRec.getValue("memo") || "",
				shipViaName: soRec.getText("shipmethod"),
				salesPersonId: soRec.getValue("salesrep"),
				salesPersonName: isEmpty(salesRepInfo) ? "" : salesRepInfo.firstname,
				salesPersonLastname: isEmpty(salesRepInfo) ? "" : salesRepInfo.lastname,
				billToId: soRec.getValue("entity") || "",
				billToName: billSubRecord.getValue("addressee") || "",
				billToPhone: billSubRecord.getValue("phone") || "",
				billAddressLine1: billSubRecord.getValue("addr1") || "",
				billAddressLine2: billSubRecord.getValue("addr2") || "",
				billAddressLine3: billSubRecord.getValue("addr3") || "",
				billCity: billSubRecord.getValue("city") || "",
				billState: billSubRecord.getValue("state") || "",
				billZip: billSubRecord.getValue("zip") || "",
				shipToId: soRec.getValue("entity") || "",
				shipToName: shipSubRecord.getValue("addressee") || "",
				shipToPhone: shipSubRecord.getValue("phone") || "",
				shipAddressLine1: shipSubRecord.getValue("addr1") || "",
				shipAddressLine2: shipSubRecord.getValue("addr2") || "",
				shipAddressLine3: shipSubRecord.getValue("addr3") || "",
				shipCity: shipSubRecord.getValue("city") || "",
				shipState: shipSubRecord.getValue("state") || "",
				shipZip: shipSubRecord.getValue("zip") || "",
			});

			const itemLineInfo = [];
			for (let i = 0; i < rec.getLineCount("item"); i++) {
				const itemReceive = rec.getSublistValue({
					sublistId: "item",
					fieldId: "itemreceive",
					line: i,
				});

				if (itemReceive === "T" || (itemReceive === true && TYPE === "I")) {
					const itemId = rec.getSublistValue({
						sublistId: "item",
						fieldId: "itemname",
						line: i,
					});

					const rate = soRec.getSublistValue({
						sublistId: "item",
						fieldId: "rate",
						line: i,
					});
					const order_quantity = rec.getSublistValue({
						sublistId: "item",
						fieldId: "quantity",
						line: i,
					});
					let lineAmount = 0;
					lineAmount = parseFloat(rate) * parseFloat(order_quantity);

					itemLineInfo.push({
						order_quantity: order_quantity,
						number: itemId,
						rate: rate,
						amount: lineAmount,
						description: rec.getSublistValue({
							sublistId: "item",
							fieldId: "description",
							line: i,
						}),
						location: rec.getSublistValue({
							sublistId: "item",
							fieldId: "location",
							line: i,
						}),
						poVendor: rec.getSublistValue({
							sublistId: "item",
							fieldId: "custcol_bsp_isg_po_vendor_display",
							line: i,
						}),
					});
				} else { //get the RMA sublist information
					const itemId = rec.getSublistText({
						sublistId: "item",
						fieldId: "item",
						line: i,
					});

					const rate = soRec.getSublistValue({
						sublistId: "item",
						fieldId: "rate",
						line: i,
					});
					const order_quantity = rec.getSublistValue({
						sublistId: "item",
						fieldId: "quantity",
						line: i,
					});
					let lineAmount = 0;
					lineAmount = parseFloat(rate) * parseFloat(order_quantity);

					itemLineInfo.push({
						order_quantity: order_quantity,
						number: itemId,
						rate: rate,
						amount: lineAmount,
						description: rec.getSublistValue({
							sublistId: "item",
							fieldId: "description",
							line: i,
						}),
						location: rec.getSublistValue({
							sublistId: "item",
							fieldId: "location",
							line: i,
						}),
						poVendor: soRec.getSublistValue({
							sublistId: "item",
							fieldId: "custcol_bsp_isg_po_vendor_display",
							line: i,
						}),
					});
				}
			}
			log.debug("order obj", { orderHeaderFields, itemLineInfo });
			return { orderHeaderFields, itemLineInfo };
		} catch (e) {
			log.error("getOrderDetails", e.message);
		}
	}

	/**
	 * Create XML body from IF or RMA and SO and send the request using Elite Extra integration settings
	 * @param recId
	 * @param {*} eliteExtraId
	 */
	function sendOrderDetails(recId, eliteExtraId) {
		try {
			const orderObj = getOrderDetails(recId);
			const headerFieldsInfo = [orderObj.orderHeaderFields];
			const lineItemInfo = orderObj.itemLineInfo;

			let lineItemXml = "";
			/******************************
			 Create line XML from Order Object Line info
			 *******************************/
			lineItemInfo.forEach(function (lineItem) {
				let poVendor;
				if (isEmpty(lineItem.poVendor)) {
					poVendor = "";
				}
				lineItemXml += `
                    <line>
                  <order_quantity>${lineItem.order_quantity}</order_quantity>
                  <ship_quantity>${lineItem.order_quantity}</ship_quantity>
                  <price>${lineItem.rate}</price>
                  <cost>${lineItem.amount}</cost>
                  <part>
                      <number>${lineItem.number}</number>
                      <description>${lineItem.description} - ${poVendor}</description>
                  </part>
                  <weight></weight>
                  <length></length>
                  <width></width>
                  <height></height>
                  <integration_type></integration_type>
                  <uom></uom>
              </line>`;
			});
			/***********************************
			 Map the Order Details into the XML body
			 ************************************/
			let orderXML = `<?xml version="1.0"?>
<order id="${headerFieldsInfo[0][0].orderId}">
    <warehouse id="1">
    </warehouse>
    <po>${headerFieldsInfo[0][0].po}</po>
    <ecommerce_id></ecommerce_id>
    <status>${headerFieldsInfo[0][0].status}</status>
    <type>${headerFieldsInfo[0][0].type}</type>
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
			log.debug("orderXML", orderXML);
			const eliteExtraSettings = getEliteExtraSettings(eliteExtraId);
			return BSPEliteExtraAPIService.uploadOrder(
				recId,
				eliteExtraId,
				orderXML,
				eliteExtraSettings,
				headerFieldsInfo[0][0].type
			);
		} catch (e) {
			log.error("sendOrderDetails", e.message);
		}
	}

	/**
	 * Load elite extra settings
	 * @param {*} eliteExtraId
	 */
	function getEliteExtraSettings(eliteExtraId) {
		try {
			const eliteExtraSettingResults = {};
			const eliteExtraSettingsSearch = search.lookupFields({
				type: "customrecord_bsp_isg_elite_extra_setting",
				id: eliteExtraId,
				columns: [
					"custrecord_bsp_isg_based64encoding",
					"custrecord_bsp_isg_create_order_ep_url",
					"custrecord_bsp_isg_order_tracking_link",
					"custrecord_bsp_isg_if_status_for_upload",
				],
			});
			eliteExtraSettingResults["endpointURL"] =
				eliteExtraSettingsSearch["custrecord_bsp_isg_create_order_ep_url"];
			eliteExtraSettingResults["authorization"] =
				eliteExtraSettingsSearch["custrecord_bsp_isg_based64encoding"];
			eliteExtraSettingResults["trackingLink"] =
				eliteExtraSettingsSearch["custrecord_bsp_isg_order_tracking_link"];
			eliteExtraSettingResults["uploadStatus"] =
				eliteExtraSettingsSearch["custrecord_bsp_isg_if_status_for_upload"];
			return eliteExtraSettingResults;
		} catch (e) {
			log.debug("getEliteExtraSettings", e.message);
		}
	}

	/**
	 * Check if empty string is passed
	 * @param {*} stValue
	 */
	function isEmpty(stValue) {
		return (
			stValue === "" ||
			stValue == null ||
			stValue == undefined ||
			(stValue.constructor === Array && stValue.length == 0) ||
			(stValue.constructor === Object &&
				(function (v) {
					for (var k in v) return false;
					return true;
				})(stValue))
		);
	}

	/**
	 * format the date time into ISO 8601 format and set the timezone to newyork
	 * @param {*} date
	 */
	function formatDateTime(date) {
		const dateTime = format.format({
			value: new Date(date),
			type: format.Type.DATETIMETZ,
			timezone: format.Timezone.AMERICA_NEW_YORK,
		});
		let dateobj = new Date(dateTime);
		return dateobj.toISOString();
	}

	/**
	 * Update Item Fulfillment or Return Authorization tracking number and tracking link
	 * @param res
	 * @param id
	 * @param trackingLink
	 * @param type
	 * @returns {*[]}
	 */
	function updateRecordTrackingInfo(res, id, trackingLink, type) {
		try {
			const response = res.body;
			const resString = [response];
			const resBody = JSON.parse(resString[0]);
			let message = [];
			if (res.code === 200 && !isEmpty(resBody.tracking)) {
				if (type == "itemfulfillment") {
					const ifUpdateId = record.submitFields({
						type: record.Type.ITEM_FULFILLMENT,
						id: id,
						values: {
							custbody_bsp_isg_tracking_number: resBody.tracking,
							custbody_bsp_isg_tracking_link: trackingLink + resBody.tracking,
						},
					});
					log.debug("IF ID: " + ifUpdateId + " Updated", [
						resBody.tracking,
						resBody.filename,
					]);
					message.push({
						message: "Order has been uploaded successfully.",
						failed: false,
					});
				} else {
					const rmaIdUpdated = record.submitFields({
						type: record.Type.RETURN_AUTHORIZATION,
						id: id,
						values: {
							custbody_bsp_isg_tracking_number: resBody.tracking,
							custbody_bsp_isg_tracking_link: trackingLink + resBody.tracking,
						},
					});
					log.debug("RMA: " + rmaIdUpdated + " Updated", [
						resBody.tracking,
						resBody.filename,
					]);
					message.push({
						message: "Order has been uploaded successfully.",
						failed: false,
					});
				}
			} else {
				message.push({
					message: "Failed to create order",
					failed: true,
				});
			}
			log.debug("message", message);
			return message;
		} catch (e) {
			log.debug("updateRecordTrackingInfo", e.message);
		}
	}

	return {
		isEmpty: isEmpty,
		sendOrderDetails: sendOrderDetails,
		getEliteExtraSettings: getEliteExtraSettings,
		updateRecordTrackingInfo: updateRecordTrackingInfo,
	};
});
