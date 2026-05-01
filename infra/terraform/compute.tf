variable "compartment_ocid" {}
variable "region" {}
variable "availability_domain" {}
variable "subnet_id" {}
variable "ssh_public_key" {}
variable "image_id" {}

provider "oci" {
  region = var.region
}

resource "oci_core_instance" "poa_vm_arm" {
  availability_domain = var.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "poa-transparente-arm"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 4
    memory_in_gbs = 24
  }

  create_vnic_details {
    subnet_id        = var.subnet_id
    assign_public_ip = true
    display_name     = "primaryvnic"
  }

  source_details {
    source_type = "image"
    source_id   = var.image_id 

  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }

  # Impede que o terraform tente recriar se você mudar algo pequeno
  lifecycle {
    ignore_changes = [source_details]
  }
}

output "public_ip" {
  value = oci_core_instance.poa_vm_arm.public_ip
}
