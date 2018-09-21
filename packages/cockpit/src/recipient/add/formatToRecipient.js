import { range } from 'ramda'

const removeLastDigit = number => number.slice(0, -1)
const getLastDigit = number => number.slice(-1)
const getOnlyNumbers = string => string.replace(/\D/g, '')

// TODO: break into smaller functions
function formatToRecipient (data) {
  const recipientData = {}
  const { documentType } = data.identification

  // Bank account
  if (data.bankAccount.id) {
    recipientData.bank_account_id = data.bankAccount.id
  } else {
    const { number } = data.bankAccount
    const document = data.identification[documentType]

    recipientData.bank_account = {
      bank_code: data.bankAccount.bank,
      // TODO: limite de 5 caracteres
      agencia: data.bankAccount.agency,
      // TODO: coletar?
      // agencia_dv: '',
      // TODO: limite de 13 caracteres
      conta: removeLastDigit(number),
      // TODO: limite de 2 caracteres
      conta_dv: getLastDigit(number),
      type: data.bankAccount.type,
      document_number: getOnlyNumbers(document),

      // TODO: limite de 30 caracteres
      legal_name: data.bankAccount.name,
    }
  }

  // Transfer
  // TODO: transfer interval quando !transferEnabled deve ser zero
  recipientData.transfer_interval = data.configuration.transferInterval
  recipientData.transfer_enabled = data.configuration.transferEnabled

  if (data.configuration.transferInterval === 'weekly') {
    const weekDayNumberMap = {
      monday: '1',
      tuesday: '2',
      wednesday: '3',
      thursday: '4',
      friday: '5',
    }
    const weekDay = data.configuration.transferWeekday
    const transferDay = weekDayNumberMap[weekDay]
    recipientData.transfer_day = transferDay
  } else {
    recipientData.transfer_day = data.configuration.transferDay
  }

  // Anticipation

  // TODO: "automatic_anticipation_type" só pode existir se
  // "config_anticipation_params" nos dados da company for true
  switch (data.configuration.anticipationModel) {
    case 'automatic_dx':
      recipientData.anticipatable_volume_percentage = 100
      recipientData.automatic_anticipation_enabled = true
      // recipientData.automatic_anticipation_type = '1025'
      recipientData.automatic_anticipation_days = range(1, 32)
      recipientData.automatic_anticipation_1025_delay =
        data.configuration.anticipationDays
      break
    case 'automatic_volume':
      recipientData.anticipatable_volume_percentage =
        data.configuration.anticipationVolumePercentage
      recipientData.automatic_anticipation_enabled = true
      // recipientData.automatic_anticipation_type = 'full'
      break
    case 'automatic_1025':
      recipientData.anticipatable_volume_percentage = 100
      recipientData.automatic_anticipation_enabled = true
      // recipientData.automatic_anticipation_type = '1025'
      recipientData.automatic_anticipation_days = [10, 25]
      recipientData.automatic_anticipation_1025_delay = 15
      break
    case 'manual':
    default:
      recipientData.anticipatable_volume_percentage =
        data.configuration.anticipationVolumePercentage
      recipientData.automatic_anticipation_enabled = false
      // recipientData.automatic_anticipation_type = 'full'
      break
  }

  // Register
  const hasRegisterInformation = data
    .identification[`${documentType}Information`]

  if (hasRegisterInformation) {
    const phone = data.identification[`${documentType}Phone`]
    const phoneDigits = getOnlyNumbers(phone)
    const ddd = phoneDigits.slice(0, 2)
    const number = phoneDigits.slice(2)
    const url = data.identification[`${documentType}Url`]

    recipientData.register_information = {
      document_number: data.identification[documentType]
        .replace(/\D/g, ''),
      // TODO: validar http(s) no formulário
      site_url: `http://${url}`,
      email: data.identification[`${documentType}Email`],
      phone_numbers: [{
        ddd,
        number,
        // TODO: recuperar tipo de telefone do formulário
        type: 'mobile',
      }],
    }

    const name = data.identification[`${documentType}Name`]

    if (documentType === 'cpf') {
      recipientData.register_information.type = 'individual'
      recipientData.register_information.name = name
    }

    if (documentType === 'cnpj') {
      recipientData.register_information.type = 'corporation'
      recipientData.register_information.company_name = name
    }

    const partnerNumber = parseInt(data.identification.partnerNumber, 10)

    if (partnerNumber > 0) {
      const partners = range(0, partnerNumber)
        .map(n => data.identification[`partner${n}`])
        // TODO: Precisa de email, não usa telefone
        .map(partner => ({
          type: 'individual',
          document_number: getOnlyNumbers(partner.cpf),
          name: partner.name,
          email: 'some@email.com',
        }))

      recipientData.register_information.managing_partners = partners
    }
  }

  return recipientData
}

export default formatToRecipient
