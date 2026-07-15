import type { Schema, Struct } from '@strapi/strapi';

export interface AboutUsContentAboutUsContent extends Struct.ComponentSchema {
  collectionName: 'components_about_us_content_about_us_contents';
  info: {
    displayName: 'About Us Content';
  };
  attributes: {
    About_Us_Content_Text: Schema.Attribute.Blocks;
    About_Us_Content_Title: Schema.Attribute.String;
  };
}

export interface AboutUsInfoAboutUsInfo extends Struct.ComponentSchema {
  collectionName: 'components_about_us_info_about_us_infos';
  info: {
    displayName: 'About Us Info';
  };
  attributes: {
    About_Us_Info_Letter: Schema.Attribute.String;
    About_Us_Info_Text: Schema.Attribute.String;
    About_Us_Info_Word: Schema.Attribute.String;
  };
}

export interface FooterOptionFooterColumn01Option
  extends Struct.ComponentSchema {
  collectionName: 'components_footer_option_footer_column_01_options';
  info: {
    displayName: 'Footer Column 01 Option';
  };
  attributes: {
    Option_Text: Schema.Attribute.String;
    Option_URL: Schema.Attribute.String;
  };
}

export interface FooterOptionFooterColumn02Option
  extends Struct.ComponentSchema {
  collectionName: 'components_footer_option_footer_column_02_options';
  info: {
    displayName: 'Footer Column 02 Option';
  };
  attributes: {
    Option_Text: Schema.Attribute.String;
    Option_URL: Schema.Attribute.String;
  };
}

export interface FooterOptionFooterColumn03Option
  extends Struct.ComponentSchema {
  collectionName: 'components_footer_option_footer_column_03_options';
  info: {
    displayName: 'Footer Column 03 Option';
  };
  attributes: {
    Option_Text: Schema.Attribute.String;
    Option_URL: Schema.Attribute.String;
  };
}

export interface GuideContentGuideContent extends Struct.ComponentSchema {
  collectionName: 'components_guide_content_guide_contents';
  info: {
    displayName: 'Guide Content';
  };
  attributes: {
    Guide_Content_Media: Schema.Attribute.Media<
      'images' | 'videos' | 'audios' | 'files'
    >;
    Guide_Content_Media_Name: Schema.Attribute.String;
    Guide_Content_Media_Position: Schema.Attribute.Enumeration<
      ['Top', 'Bottom', 'Left', 'Right']
    >;
    Guide_Content_Text: Schema.Attribute.RichText;
    Guide_Content_Title: Schema.Attribute.String;
  };
}

export interface NewsContentNewsContent extends Struct.ComponentSchema {
  collectionName: 'components_news_content_news_contents';
  info: {
    displayName: 'News Content';
    icon: 'cast';
  };
  attributes: {
    News_Content_Image: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios'
    >;
    News_Content_Image_Position: Schema.Attribute.Enumeration<
      ['Top', 'Bottom', 'Left', 'Right']
    >;
    News_Content_Text: Schema.Attribute.Blocks;
  };
}

export interface RedSocialIconoDeRedSocial extends Struct.ComponentSchema {
  collectionName: 'components_red_social_icono_de_red_socials';
  info: {
    displayName: 'Icono de Red Social';
  };
  attributes: {
    Red_Social_Icono: Schema.Attribute.Media<'images'>;
    Red_Social_Name: Schema.Attribute.String;
    Red_Social_URL: Schema.Attribute.String;
  };
}

export interface RedSocialRedesSociales extends Struct.ComponentSchema {
  collectionName: 'components_red_social_redes_sociales';
  info: {
    displayName: 'Redes_Sociales';
  };
  attributes: {
    Plataform: Schema.Attribute.Enumeration<
      ['Facebook', 'Instagram', 'Linkedin', 'TikTok', 'X', 'YouTube']
    >;
    URL: Schema.Attribute.String;
  };
}

export interface RegistrationContentRegistrationContent
  extends Struct.ComponentSchema {
  collectionName: 'components_registration_content_registration_contents';
  info: {
    displayName: 'Registration Content';
  };
  attributes: {
    Registration_Content_Text: Schema.Attribute.RichText;
    Registration_Content_Title: Schema.Attribute.String;
  };
}

export interface SubjectValueSubject extends Struct.ComponentSchema {
  collectionName: 'components_subject_value_subjects';
  info: {
    displayName: 'Subject';
  };
  attributes: {
    Subject_Value: Schema.Attribute.String;
  };
}

export interface TaxResourceTaxResource extends Struct.ComponentSchema {
  collectionName: 'components_tax_resource_tax_resources';
  info: {
    displayName: 'Tax Resource';
  };
  attributes: {};
}

export interface TextAndGraphicContentTextAndGraphicContent
  extends Struct.ComponentSchema {
  collectionName: 'components_text_and_graphic_content_text_and_graphic_contents';
  info: {
    displayName: 'Text and Graphic Content';
  };
  attributes: {
    Media: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    Media_Position: Schema.Attribute.Enumeration<
      ['Top', 'Bottom', 'Right', 'Left']
    >;
    Text: Schema.Attribute.Blocks;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about-us-content.about-us-content': AboutUsContentAboutUsContent;
      'about-us-info.about-us-info': AboutUsInfoAboutUsInfo;
      'footer-option.footer-column-01-option': FooterOptionFooterColumn01Option;
      'footer-option.footer-column-02-option': FooterOptionFooterColumn02Option;
      'footer-option.footer-column-03-option': FooterOptionFooterColumn03Option;
      'guide-content.guide-content': GuideContentGuideContent;
      'news-content.news-content': NewsContentNewsContent;
      'red-social.icono-de-red-social': RedSocialIconoDeRedSocial;
      'red-social.redes-sociales': RedSocialRedesSociales;
      'registration-content.registration-content': RegistrationContentRegistrationContent;
      'subject-value.subject': SubjectValueSubject;
      'tax-resource.tax-resource': TaxResourceTaxResource;
      'text-and-graphic-content.text-and-graphic-content': TextAndGraphicContentTextAndGraphicContent;
    }
  }
}
