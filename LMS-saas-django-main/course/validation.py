from django.core.exceptions import ValidationError

class ValidationCourse :
     def clean(self):
            errors = {}
            if not self.title:
                errors["title"] = "Course title is required to publish."
            if not self.subtitle:
                errors["subtitle"] = "Course subtitle is required to publish."
            if not self.description:
                errors["description"] = "Course description is required to publish."
            if self.is_paid and  self.price <= 0:
                print(self.price)
                errors["price"] = "A valid price is required for paid courses."
            if not self.sub_category:
                errors["sub_category"] = "Course must have a subcategory."
            if not self.picture:
                errors["picture"] = "Course picture is required to publish."

            if errors:
                raise ValidationError(errors)

     def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

