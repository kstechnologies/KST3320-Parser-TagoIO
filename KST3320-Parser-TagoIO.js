/** 
* @file     KST3320-Parser-TagoIO.js
* @brief    Parser for KST3320 for use on TagoIO
* @author   DS
* @version  1.0.0
* @date     2021-10-13
*/
/* {{{ ------------------------------------------------------------------ */
/** 
 * @licence
 * Copyright (c) 2019 - 2021, KS Technologies, LLC
 * 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form, except as embedded into a KS Technologies
 *    product or a software update for such product, must reproduce the above 
 *    copyright notice, this list of conditions and the following disclaimer in 
 *    the documentation and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of KS Technologies nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * 4. This software, with or without modification, must only be used with a
 *    KS Technologies, LLC product.
 * 
 * 5. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 * 
 * THIS SOFTWARE IS PROVIDED BY KS TECHNOLOGIES LLC "AS IS" AND ANY EXPRESS
 * OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL KS TECHNOLOGIES, LLC OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
/* ------------------------------------------------------------------ }}} */

// Search the payload variable in the payload global variable. It's contents is always [ { variable, value...}, {variable, value...} ...]
const payload_raw = payload.find(x => x.variable === 'payload_raw' || x.variable === 'payload' || x.variable === 'data');
if (payload_raw) {
  let lora_channel = 0;
  let data_type = 0;
  // Convert the data from Hex to Javascript Buffer.
  const buffer = Buffer.from(payload_raw.value, 'hex');
  let data = [];
  try {
    lora_channel = Number(buffer.readInt8(0));
    data_type = Number(buffer.readUint8(1));

    data = [{
        variable: 'lora_channel', // LoRa Channel
        value: lora_channel
      },
      {
        variable: 'data_type', // Data Type
        value: data_type
      }
    ];

  } catch (e) {
    // Print the error to the Live Inspector.
    console.error(e);

    // Return the variable parse_error for debugging.
    payload = [{
      variable: 'parse_error',
      value: e.message
    }];
  }

  // 0x82 = Distance
  if (data_type == parseInt(0x82)) {
    data[2] = {
      variable: 'distance',
      value: '',
      unit: 'mm'
    };
    data[2].value = Number(buffer.readInt16BE(2))

    // Fill Level
    var heightAboveFillLine = 0; // Distance (in millimeters) from top of fill line to bottom of KST3320
    var distanceToBottom = 4000; // Total height of the bin/object being measured in millimeters
    var calculatedPercentage;

    calculatedPercentage = 100 - (100 * ((data[2].value - heightAboveFillLine) / distanceToBottom));

    if (calculatedPercentage >= 100) calculatedPercentage = 100;
    if (calculatedPercentage < 0) calculatedPercentage = 0;

    data[3] = {
      variable: 'fill_level',
      value: ''
    };
    data[3].value = calculatedPercentage;

    // 0x78 = Battery
  } else if (data_type == parseInt(0x78)) {
    data[2] = {
      variable: 'battery',
      value: ''
    };
    data[2].value = Number(buffer.readInt8(2))

    // 0x88 = GPS
  } else if (data_type == parseInt(0x88) && buffer.length == 11) {
    data[2] = {
      variable: 'latitude',
      value: ''
    };
    data[2].value = Number(buffer.readIntBE(2, 3)) / 10000

    data[3] = {
      variable: 'longitude',
      value: ''
    };
    data[3].value = Number(buffer.readIntBE(5, 3)) / 10000

    data[4] = {
      variable: 'altitude',
      value: ''
    };
    data[4].value = Number(buffer.readIntBE(8, 3)) / 100

    // Concat Lat + Lng to Location
    data[5] = {
      variable: 'location',
      location: {
        lat: data[2].value,
        lng: data[3].value
      }
    };

    // 0x88 = Extended GPS (if ADR is enabled)
  } else if (data_type == parseInt(0x88) && buffer.length == 20) {
    data[2] = {
      variable: 'latitude',
      value: ''
    };
    data[2].value = Number(buffer.readIntBE(2, 3)) / 10000

    data[3] = {
      variable: 'longitude',
      value: ''
    };
    data[3].value = Number(buffer.readIntBE(5, 3)) / 10000

    data[4] = {
      variable: 'altitude',
      value: ''
    };
    data[4].value = Number(buffer.readIntBE(8, 3)) / 100

    // Concat Lat + Lng to Location
    data[5] = {
      variable: 'location',
      location: {
        lat: data[2].value,
        lng: data[3].value
      }
    };

    data[6] = {
      variable: 'horizontal_accuracy',
      value: ''
    };
    data[6].value = Number(buffer.readIntBE(11, 4)) / 1000

    data[7] = {
      variable: 'vertical_accuracy',
      value: ''
    };
    data[7].value = Number(buffer.readIntBE(15, 4)) / 1000

    data[8] = {
      variable: 'satellites',
      value: ''
    };
    data[8].value = Number(buffer.readInt8(19))
  }


  // This will concat the content sent by your device with the content generated in this payload parser.
  // It also add the field "serie" and "time" to it, copying from your sensor data.
  payload = payload.concat(data.map(x => ({
    ...x,
    serie: payload_raw.serie,
    time: payload_raw.time
  })));
}