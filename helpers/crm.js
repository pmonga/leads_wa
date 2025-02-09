import axios from "axios";

export default async (data) => {
  return axios({
    method: "POST",
    url: `https://admin-schedule.alchemistindia.com/cp2/schedule/apis/whatsappContact`,
    headers: {
      "Content-Type": "application/json"
    },
    data
  });
};
