export type Council = {
  id: string;
  name: string;
  email: string;
  reportUrl: string;
  phone: string;
};

/** NZ territorial authorities with road-fault reporting channels. */
export const councils: Council[] = [
  { id: 'auckland', name: 'Auckland Council / Auckland Transport', email: 'onlineforms@at.govt.nz', reportUrl: 'https://at.govt.nz/about-us/contact-us/report-a-problem', phone: '09 355 3553' },
  { id: 'wellington', name: 'Wellington City Council', email: 'info@wcc.govt.nz', reportUrl: 'https://wellington.govt.nz/report-a-problem', phone: '04 499 4444' },
  { id: 'christchurch', name: 'Christchurch City Council', email: 'info@ccc.govt.nz', reportUrl: 'https://ccc.govt.nz/consents-and-licences/request-a-service', phone: '03 941 8999' },
  { id: 'hamilton', name: 'Hamilton City Council', email: 'council@hcc.govt.nz', reportUrl: 'https://hamilton.govt.nz/report-a-problem/', phone: '07 838 6699' },
  { id: 'tauranga', name: 'Tauranga City Council', email: 'info@tauranga.govt.nz', reportUrl: 'https://tauranga.govt.nz/council/contact-us', phone: '07 577 7000' },
  { id: 'dunedin', name: 'Dunedin City Council', email: 'dcc@dcc.govt.nz', reportUrl: 'https://dunedin.govt.nz/services/report-a-problem', phone: '03 477 4000' },
  { id: 'palmerston-north', name: 'Palmerston North City Council', email: 'info@pncc.govt.nz', reportUrl: 'https://pncc.govt.nz/Council/Report-a-problem', phone: '06 356 8199' },
  { id: 'napier', name: 'Napier City Council', email: 'info@napier.govt.nz', reportUrl: 'https://napier.govt.nz/services/report-a-problem/', phone: '06 835 7579' },
  { id: 'hastings', name: 'Hastings District Council', email: 'requests@hdc.govt.nz', reportUrl: 'https://hastingsdc.govt.nz/contact-us/', phone: '06 871 5000' },
  { id: 'new-plymouth', name: 'New Plymouth District Council', email: 'enquiries@npdc.govt.nz', reportUrl: 'https://npdc.govt.nz/council/contact-us/', phone: '06 759 6060' },
  { id: 'rotorua', name: 'Rotorua Lakes Council', email: 'info@rotorualc.nz', reportUrl: 'https://rotorualakescouncil.nz/contact-us', phone: '07 348 4199' },
  { id: 'whangarei', name: 'Whangārei District Council', email: 'mailroom@wdc.govt.nz', reportUrl: 'https://wdc.govt.nz/Council/Contact-us', phone: '09 430 4200' },
  { id: 'nelson', name: 'Nelson City Council', email: 'enquiry@ncc.govt.nz', reportUrl: 'https://nelson.govt.nz/services/report-a-problem/', phone: '03 546 0200' },
  { id: 'queenstown', name: 'Queenstown Lakes District Council', email: 'services@qldc.govt.nz', reportUrl: 'https://qldc.govt.nz/report-a-problem', phone: '03 441 0499' },
  { id: 'invercargill', name: 'Invercargill City Council', email: 'service@icc.govt.nz', reportUrl: 'https://icc.govt.nz/contact-us/', phone: '03 211 1777' },
  { id: 'nzta', name: 'NZ Transport Agency (state highways)', email: 'info@nzta.govt.nz', reportUrl: 'https://nzta.govt.nz/contact-us/report-a-problem/', phone: '0800 44 44 49' },
];
